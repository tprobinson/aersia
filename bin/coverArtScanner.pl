#!/usr/bin/env perl

use strict;
use warnings;

use WWW::Mechanize;
use JSON::MaybeXS;
use File::Slurp;
use HTML::TreeBuilder::XPath;

my $agent = WWW::Mechanize->new();

my $playlist = decode_json(read_file('roster.json')) || die $!;

$playlist = [ @$playlist[5]];


foreach my $i ( 0..((scalar @{$playlist}) - 1) ) {

    # Ignore stuff at the front
    if (
    $playlist->[$i]->{'creator'} eq "Vidya Intarweb Playlist" ||
    $playlist->[$i]->{'creator'} =~ /^MOTD/ ||
    $playlist->[$i]->{'creator'} eq "Changelog" ||
    $playlist->[$i]->{'creator'} eq "Notice"
    ) { next; }

    my $game = $playlist->[$i]->{'creator'};

    print $game,': ';
    my $tree = HTML::TreeBuilder::XPath->new;
    my $content;

    # Check mobygames

    # Construct a friendly version of the URL
    $game =~ s/[^\w -]//g; # Remove special characters that are not dashes or spaces.
    $game =~ s/ /-/g; # Convert all spaces to dashes.
    $game = lc $game;

    $agent->get("http://www.mobygames.com/game/$game/cover-art") || die $!;

    $content = $agent->content();
    if( $content !~ /The requested page could not be found, perhaps one of these games might be what you are looking for./ )
    {
        if( ! $tree->parse($content) )
        {
            print "Webpage parse failed for $game";
            next;
        }

        my @covers = $tree->findnodes('//div[@id="main"]/div/div[last()]/div[@class!="pull-right"]');

        my %lookup = ();

        # TODO: Add error checking.
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
                my $title = $link->attr('title');
                $shots{($type->content_list)[0]}->{'title'} = $title;

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
        print 'Done';

    } else {
        print "Could not find Mobygames page.";
    }

    # Check Steam, or not.
    print "\n";

}

write_file('roster_fullArt.json', encode_json($playlist)) || die $!;
print "Art retrieved, post-processing.\n";

# Go through and find the best art.
# Find in prioritized order: Wii U(squarest icons), Wii, Windows, any Playstation, any Xbox, any other.
# Order 2nd tier: Electronic packaging, Worldwide release, United States release, NTSC video standard, any other.
# Order 3rd tier: Front Cover, any.

SONG: foreach my $song( @$playlist )
{
    if( ! defined $song->{'fullArt'} )
    {
        print $song->{'creator'}, ' did not have fullArt.',"\n";
        next;
    }

    # Build a list of platforms
    my @platforms;
    foreach my $target ( qw/Wii Windows Playstation Xbox/ )
    {
        if( grep{/$target/i} keys %{$song->{'fullArt'}} )
        { push @platforms, $target; }
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
            if ( grep{/$target/i} keys %{$song->{'fullArt'}->{$platform}} )
            { push @attrs, $target; }
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

                if( grep{/$target->[1]/i} keys %{$song->{'fullArt'}->{$platform}->{$attr}} )
                { push @values, $target->[1]; }
            }

            # Just take them all if we couldn't get any priorities.
            if( scalar @values == 0 ) { @values = keys %{$song->{'fullArt'}->{$platform}->{$attr}}; }

            # Loop over values (level 4)
            foreach my $value ( @values )
            {
                if( ! defined $song->{'fullArt'}->{$platform}->{$attr}->{$value} )
                { print 'Error: ', $song->{'creator'}, ' had bogus attrvalue ',$attr,',',$value,"\n"; next; }

                # Check for a Front Cover, if not, use whatever.
                my @covers;
                foreach my $target ( @{$song->{'fullArt'}->{$platform}->{$attr}->{$value}} )
                {
                    if( grep{/front/i} keys %{$target} )
                    { push @covers, $target; }
                }

                # Just take them all if we couldn't get any priorities.
                if( scalar @covers == 0 )
                { @covers = keys %{$song->{'fullArt'}->{$platform}->{$attr}>{$value}}; }

                # Take the last one if it exists. (the last one will tend to catch more recent release dates, etc)
                if( scalar @covers > 0 )
                {
                    $song->{'art'} = $covers[$#covers];
                    next SONG;
                }
            }
        }
    }
}

map {delete $_->{'fullArt'}} @$playlist;

write_file('roster_new.json', encode_json($playlist)) || die $!;
