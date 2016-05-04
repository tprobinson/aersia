#!/usr/bin/env perl

use strict;
use warnings;

use WWW::Mechanize;
use JSON::MaybeXS;
use File::Slurp;
use HTML::TreeBuilder::XPath;
use Term::ProgressBar;
use Getopt::Long;

my $agent = WWW::Mechanize->new();

my $playlist = decode_json(read_file('roster.json')) || die $!;

my $mapping;
if( -f 'nameMapping.json' ) { $mapping = decode_json(read_file('nameMapping.json')) || die $!; }

my %unique_arts = ();



#Process dash options
my ( $opt_namemapping, $opt_force, $opt_quiet, $opt_reprocess, $opt_purge );

GetOptions ('n|namemap!' => \$opt_namemapping,
            'r|reprocess!' => \$opt_reprocess,
			'q|quiet!' => \$opt_quiet,
			'f|force!' => \$opt_force,
            'p|purge!' => \$opt_purge,
) || die(Usage());

if( $opt_purge )
{
    map
    {
        delete $_->{'art'};
        delete $_->{'fullArt'};
    } @$playlist;

    write_file('roster_purged.json', encode_json($playlist)) || die $!;

    print "Purged roster of all art, output to roster_purged.json.\n";

    exit 0;
}


my $progress;
if( ! $opt_quiet ) { $progress = Term::ProgressBar->new((scalar @{$playlist}) - 1); }


if ( ! $opt_reprocess ) {
GAME: foreach my $i ( 0..((scalar @{$playlist}) - 1) ) {

    # Skip if we already have art, unless we're forcing.
    if( !$opt_force && ( defined $playlist->[$i]->{'art'} || defined $playlist->[$i]->{'fullArt'} ) ) { next; }

    my $game = $playlist->[$i]->{'creator'};

    # Ignore stuff at the front
    if (
        $game eq "Vidya Intarweb Playlist" ||
        $game =~ /^MOTD/ ||
        $game eq "Changelog" ||
        $game eq "Notice"
    ) { next GAME; }

    # Check if we already have scanned art for this game, and re-use it if so.
    if( defined $unique_arts{$game} )
    {
        if( $unique_arts{$game} != 0 )
        {
            $playlist->[$i]->{'fullArt'} = $unique_arts{$game};
        }
        next GAME;
    }


    # Find the right page to scan.
    my $tree = HTML::TreeBuilder::XPath->new;
    my $content;
    if( ! $opt_quiet ) { $progress->message($game); $progress->update($i); }


    # If we have a mapping file and this game is in the mapping, let's use that as URL.
    # If we're in mapping mode, ask for and check the name. Otherwise, just use the game name as URL.
    my $gameurl;
    if( defined $mapping && defined $mapping->{$game} )
    { $gameurl = $mapping->{$game}; }
    else
    {
        # If we're mapping names, that means this is a second pass when the names didn't work. Ask user for the real Mobygames name.
        if( $opt_namemapping )
        {
            NAMEMAP: while(1)
            {
                print "Enter a Mobygames-compatible name for $game, or 'skip'\n: ";
                chomp($gameurl = <STDIN>);

                if( $gameurl =~ /^\s*skip\s*$/i )
                {
                    $unique_arts{$game} = 0;
                    next GAME;
                }

                # Check mobygames for this name.
                $agent->get('http://www.mobygames.com/game/'. translate_game_to_url($gameurl) .'/cover-art') || die $!;

                $content = $agent->content();
                if( $content !~ /The requested page could not be found, perhaps one of these games might be what you are looking for/ )
                {
                    if( ! defined $mapping ) { $mapping = {}; }
                    $mapping->{$game} = $gameurl;
                    last NAMEMAP;
                }

                print "\n$gameurl was not found.\n";
            }
        }
        else { $gameurl = $game; }
    }

    # Get the actual page if we haven't already via namemapping.
    if( ! defined $content )
    {
        # Check mobygames
        $agent->get('http://www.mobygames.com/game/'. translate_game_to_url($gameurl) .'/cover-art') || die $!;

        $content = $agent->content();
        if( $content =~ /The requested page could not be found, perhaps one of these games might be what you are looking for/ )
        {
            $unique_arts{$game} = 0;
            print "Could not find Mobygames page for $game.";
            next GAME;
        }

    }

    # We have our content.
    if( ! $tree->parse($content) )
    {
        print "Webpage parse failed for $game";
        next;
    }

    my @covers = $tree->findnodes('//div[@id="main"]/div/div[last()]/div[@class!="pull-right"]');

    my %lookup = ();

    # Generate a lookup hash of all cover shots, filed by platform, then by metadata attributes, then by shot type.
    while( scalar @covers > 0 )
    {
        my $metadata = shift @covers;

        # Grab the platform it's for
        my $platform = ($metadata->look_down(_tag=>'h2')->content_list)[0];
        if( ! defined $lookup{$platform} )
        {
            $lookup{$platform} = {};
        }

        # Generate a little hash of the covers. The first element was just metadata, second half of the pair is actual cover art.
        my $row = shift @covers;
        my %shots = ();
        foreach my $shot ( ($row->content_list)[0]->content_list ) # One element child of row, then everything below that is the art
        {
            if( ref $shot ne 'HTML::Element' ) { next; }

            # Categorize attributes under the shot name, such as "Front Cover".
            my $type = ($shot->look_down( class => 'thumbnail-cover-caption' )->content_list)[0];
            $shots{($type->content_list)[0]} = {};

            my $link = ($shot->look_down( class => 'thumbnail-image-wrapper' )->content_list)[0];

            # Add the title.
            # my $title = $link->attr('title');
            # $shots{($type->content_list)[0]}->{'title'} = $title;

            # Add the thumbnail link, extracted from the background image.
            my $style = $link->attr('style');
            if( $style =~ /\(([^\)]+?)\)/ ) { $style = $1; }
            else { print "Error extracting thumbnail for $game"; }

            $shots{($type->content_list)[0]}->{'thumbnail'} = $style;

            # Add the fullsize link, just replace s with l.
            if( $style =~ m,/s/, ) { $style =~ s,/s/,/l/,; }
            else { print "Error extracting fullsize for $game"; }

            $shots{($type->content_list)[0]}->{'fullsize'} = $style;
        }

        # Add all covers filed under its various attributes. For example, Windows->Packaging->Electronic->[{'title': "Front Cover"}, etc]
        foreach my $tag ( $metadata->look_down(_tag=>'tr') )
        {
            my $key = (($tag->content_list)[0]->content_list)[0];
            my $value = ((($tag->content_list)[2]->content_list)[0]->content_list)[0];
            if( ! defined $lookup{$platform}->{ $key }->{ $value } )
            {
                $lookup{$platform}->{ $key }->{ $value } = [];
            }

            push( @{ $lookup{$platform}->{ $key }->{ $value } }, \%shots );
        }

    }

    $playlist->[$i]->{'fullArt'} = \%lookup;
    $unique_arts{$game} = \%lookup;

    if( ! $opt_quiet ) { print "\n"; }

}

write_file('roster_fullArt.json', encode_json($playlist)) || die $!;
print "Art retrieved, post-processing.\n";

} # If we're reprocessing, we've skipped all the art retrieval.
else {
    if ( ! -f 'roster_fullArt.json' )
    { die "Reprocess specified, but roster_fullArt.json does not exist.\n" }

    $playlist = decode_json(read_file('roster_fullArt.json')) || die $!;
}

# Go through and find the best art.
# Find in prioritized order: Wii U(squarest icons), Wii, Windows, any Playstation, any Xbox, any other.
# Order 2nd tier: Electronic packaging, Worldwide release, United States release, NTSC video standard, any other.
# Order 3rd tier: Front Cover, any.

SONG: foreach my $song( @$playlist )
{
    if( ! $opt_force && defined $song->{'art'} ) { next SONG; }
    if( ! defined $song->{'fullArt'} )
    {
        print $song->{'creator'}, ' did not have fullArt.',"\n";
        next SONG;
    }

    # Build a list of platforms
    my @platforms;
    foreach my $target ( qw/Wii Windows Playstation Xbox/ )
    {
        my @found = grep{/$target/i} keys %{$song->{'fullArt'}};
        if( scalar @found )
        { push @platforms, @found; }
    }

    # Just take them all if we couldn't get any priorities.
    if( scalar @platforms == 0 ) { @platforms = keys %{$song->{'fullArt'}}; }

    # Loop over platforms (level 2)
    foreach my $platform ( @platforms )
    {
        if( ! defined $song->{'fullArt'}->{$platform} )
        { print 'Error: ', $song->{'creator'}, ' had bogus platform ',$platform,"\n"; next; }

        # Build a list of desired attributes
        my @attrs;
        foreach my $target (qw/Packaging Country Video/)
        {
            my @found = grep{/$target/i} keys %{$song->{'fullArt'}->{$platform}};
            if ( scalar @found )
            { push @attrs, @found; }
        }

        # Just take them all if we couldn't get any priorities.
        if( scalar @attrs == 0 ) { @attrs = keys %{$song->{'fullArt'}->{$platform}}; }

        # Loop over attrs (level 3)
        foreach my $attr ( @attrs )
        {
            if( ! defined $song->{'fullArt'}->{$platform}->{$attr} )
            { print 'Error: ', $song->{'creator'}, ' had bogus attr ',$attr,"\n"; next; }

            # Build a list of desired values.
            my @values;
            foreach my $target ((
            ['Packaging','Electronic'],
            ['Country','Worldwide'],
            ['Country','United States'],
            ['Video','NTSC'],
            ))
            {
                if( $attr !~ /$target->[0]/i ) { next; }

                my @found = grep{/$target->[1]/i} keys %{$song->{'fullArt'}->{$platform}->{$attr}};
                if( scalar @found )
                { push @values, @found; }
            }

            # Just take them all if we couldn't get any priorities.
            if( scalar @values == 0 ) { @values = keys %{$song->{'fullArt'}->{$platform}->{$attr}}; }

            # Loop over values (level 4)
            foreach my $value ( @values )
            {
                if( ! defined $song->{'fullArt'}->{$platform}->{$attr}->{$value} )
                { print 'Error: ', $song->{'creator'}, ' had bogus attrvalue ',$attr,',',$value,"\n"; next; }

                # Separate the covers into priority, and non-priority.
                my @priority_covers;
                my @covers;
                foreach my $target ( @{$song->{'fullArt'}->{$platform}->{$attr}->{$value}} )
                {
                    foreach my $key ( keys %{$target} )
                    {
                        my $hash = $target->{$key};
                        $hash->{'title'} = $key;
                        $hash->{'source'} = 'Mobygames';

                        if( $key =~ /front/i )
                        {
                            push( @priority_covers, $hash );
                        } else {
                            push( @covers, $hash );
                        }
                    }
                }

                push(@priority_covers, sort { $a->{'title'} cmp $b->{'title'} } @covers );

                $song->{'art'} = \@priority_covers;

                # Take the last one if it exists. (the last one will tend to catch more recent release dates, etc)
                # if( scalar @covers > 0 )
                # {
                #     my $pick = sort @covers
                #     $song->{'art'} = $covers[$#covers];
                #     next SONG;
                # }
            }
        }
    }
}

map {delete $_->{'fullArt'}} @$playlist;

write_file('roster_new.json', encode_json($playlist)) || die $!;

if( defined $mapping && scalar keys %$mapping > 0 ) { write_file('nameMapping.json', encode_json($mapping)) || die $!; }


sub translate_game_to_url {
    my $game = shift;

    # Construct a friendly version of the URL
    $game =~ s/^the //;
    $game =~ s/[^\w -]//g; # Remove special characters that are not dashes or spaces.
    $game =~ s/ +/-/g; # Convert all consecutive spaces to one dash.
    $game = lc $game;

    return $game;
}

sub Usage {
    print <<EOF;
Cover art scanner for Aersia.
Usage: $0 [options]
	Options:

		--force or -f
			Does not skip entries that already have art.

        --quiet or -q
            Suppress text (sometimes).

        --namemapping or -n
            When this flag is given and an entry is encountered that does not
            exist on the scanned database, it will ask for a proper name.
            This will be output to nameMapping.json for future runs.

        --purge or -p
            Cleans roster.json of all art, and prints to roster_purged.json

        --reprocess or -r
            Only runs the second, post-scanning step. This is only useful when run over a fullArt version.
EOF
}
