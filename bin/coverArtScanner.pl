#!/usr/bin/env perl

use strict;
use warnings;

use WWW::Mechanize;
use JSON::MaybeXS;
use File::Slurp;
use HTML::TreeBuilder::XPath;
use Term::ProgressBar;
use Getopt::Long;
use List::Util qw/any/;

# As these are all regular expressions, rather than strict matches,
# be careful. E.g. "Wii" will match "Wii" and "Wii U"
my %desired_platforms = (
  # Prefer PC as this will usually catch higher quality images.
  'Macintosh and Windows' => 7,
  'Windows' => 6,

  # Prefer Wii series and Playstation, as they tend to have square icons.
  'Wii' => 6,
  'Playstation' => 6,

  # Don't prefer Xbox, usually this ends up being covers.
  'Xbox' => 1,

  # For mobile versions, these are usually good, but not as good as any existing PC versions.
  'i(Phone|Pad)' => 5,
  'Android' => 5,
);

# This just searches through the attribute keys, and should match up with desired_values.
# Don't weight this high, it should only be an edge if necessary.
my %desired_attributes = (
  'Packaging' => 3,
  'Country' => 2,
  'Video' => 1,
);

my %desired_values = (
  'Packaging' => {
    # Prefer electronic for quality, jewel case for aspect ratio.
    'Electronic' => 10,
    'Jewel Case' => 8,
  },

  'Country' => {
    'Worldwide' => 10,
    'United States' => 7,
  },

  'Video' => {
    #minorly prefer NTSC over PAL versions.
    'NTSC' => 2,
  },
);

my %desired_images = (
  # Prefer fronts.
  'Sleeve.+Front' => 6,
  'Front Cover' => 5,
  'Keep Case.+Front' => 5,

  #CD is neat too.
  'Media' => 4,
);


my $agent = WWW::Mechanize->new();

my $playlist = decode_json(read_file('roster.json')) || die $!;

my $mapping;
if( -f 'nameMapping.json' ) { $mapping = decode_json(read_file('nameMapping.json')) || die $!; }

my %unique_arts = ();


#Process dash options
my ( $opt_namemapping, $opt_force, $opt_trace, $opt_quiet, $opt_reprocess, $opt_clean, $opt_only, $opt_manual, $opt_manual_grab );

GetOptions ('n|namemap!' => \$opt_namemapping,
            'r|reprocess!' => \$opt_reprocess,
            't|trace!' => \$opt_trace,
      			'q|quiet!' => \$opt_quiet,
      			'f|force!' => \$opt_force,
            'c|clean!' => \$opt_clean,
            'o|only=s@' => \$opt_only,
) || die(Usage());

if( $opt_clean )
{
    map
    {
        delete $_->{'art'};
        delete $_->{'fullArt'};
    } @$playlist;

    write_file('roster_clean.json', encode_json($playlist)) || die $!;

    print "Cleaned roster of all art, output to roster_clean.json.\n";

    exit 0;
}


my $progress;
if( ! $opt_quiet ) { $progress = Term::ProgressBar->new((scalar @{$playlist}) - 1); }


if ( ! $opt_reprocess ) {
GAME: foreach my $i ( 0..((scalar @{$playlist}) - 1) ) {

    my $game = $playlist->[$i]->{'creator'};

    # Skip this game if we're in 'only' mode and it's not in our list.
    if( scalar @$opt_only && ! any {/$game/i} @$opt_only )
    { next; }

    # If we have already scanned this game this run, skip.
    if( defined $unique_arts{$game} )
    {
        if( $unique_arts{$game} != 0 )
        {
            $playlist->[$i]->{'fullArt'} = $unique_arts{$game};
        }
        next GAME;
    }

    # If we're forcing, remove any art we've already found for this item.
    if( $opt_force )
    {
        delete $playlist->[$i]->{'art'};
        delete $playlist->[$i]->{'fullArt'};
    }

    # If this game already has art in the file (such as a re-run), skip.
    if( defined $playlist->[$i]->{'art'} || defined $playlist->[$i]->{'fullArt'} )
    { next; }

    # Skip stuff at the front.
    if (
        $game eq 'Vidya Intarweb Playlist' ||
        $game =~ /^MOTD/ ||
        $game eq 'Changelog' ||
        $game eq 'Notice'
    ) { next GAME; }


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
        my $descend = $metadata->look_down(_tag=>'h2');
        next if ! defined $descend; # excludes "covers" that don't have an actual title.
        my $platform = ($descend->content_list)[0];
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
    my $game = $song->{'creator'};

    # Skip this game if we're in 'only' mode and it's not in our list.
    if( scalar @$opt_only && ! any {/$game/i} @$opt_only )
    { next; }

    # If we have already scanned this game this run, skip.
    if( defined $unique_arts{$game} )
    {
        if( $unique_arts{$game} != 0 )
        {
            $song->{'fullArt'} = $unique_arts{$game};
        }
        next GAME;
    }

    # If we're forcing, remove any art we've already processed for this item.
    if( $opt_force )
    {
        delete $song->{'art'};
    }

    # If this game already has art in the file (such as a re-run), skip.
    if( defined $song->{'art'} )
    { next; }

    # If the game didn't get anything from MobyGames, skip.
    if( ! defined $song->{'fullArt'} )
    {
        print $song->{'creator'}, ' has no art.',"\n";
        next SONG;
    }

    # Skip stuff at the front.
    if (
        $game eq 'Vidya Intarweb Playlist' ||
        $game =~ /^MOTD/ ||
        $game eq 'Changelog' ||
        $game eq 'Notice'
    ) { next GAME; }

    # # Build a list of platforms
    # my @platforms;
    # foreach my $target (keys %desired_platforms)
    # {
    #     my @found = grep{/$target/i} keys %{$song->{'fullArt'}};
    #     if( scalar @found )
    #     { push @platforms, @found; }
    # }
    #
    # # Just take them all if we couldn't get any priorities.
    # if( scalar @platforms == 0 ) { @platforms = keys %{$song->{'fullArt'}}; }
    #
    # tracelog($game,'Found platforms: '.join(',',@platforms));
    #
    # # Loop over platforms (level 2)
    # foreach my $platform ( @platforms )
    # {
    #     if( ! defined $song->{'fullArt'}->{$platform} )
    #     { print 'Error: ', $song->{'creator'}, ' had bogus platform ',$platform,"\n"; next; }
    #
    #     # Build a list of desired attributes
    #     my @attrs;
    #     foreach my $target (@desired_attributes)
    #     {
    #         my @found = grep{/$target/i} keys %{$song->{'fullArt'}->{$platform}};
    #         if ( scalar @found )
    #         { push @attrs, @found; }
    #     }
    #
    #     # Just take them all if we couldn't get any priorities.
    #     if( scalar @attrs == 0 ) { @attrs = keys %{$song->{'fullArt'}->{$platform}}; }
    #
    #     tracelog($game,'Found attributes: '.join(',',@attrs));
    #
    #     # Loop over attrs (level 3)
    #     foreach my $attr ( @attrs )
    #     {
    #         if( ! defined $song->{'fullArt'}->{$platform}->{$attr} )
    #         { print 'Error: ', $song->{'creator'}, ' had bogus attr ',$attr,"\n"; next; }
    #
    #         # Build a list of desired values.
    #         my @values;
    #         foreach my $target (@desired_values)
    #         {
    #             if( $attr !~ /$target->[0]/i ) { next; }
    #
    #             my @found = grep{/$target->[1]/i} keys %{$song->{'fullArt'}->{$platform}->{$attr}};
    #             if( scalar @found )
    #             { push @values, @found; }
    #         }
    #
    #         # Just take them all if we couldn't get any priorities.
    #         if( scalar @values == 0 ) { @values = keys %{$song->{'fullArt'}->{$platform}->{$attr}}; }
    #
    #         tracelog($game,'Found values: '.join(',',@values));
    #
    #         # Loop over values (level 4)
    #         foreach my $value ( @values )
    #         {
    #             if( ! defined $song->{'fullArt'}->{$platform}->{$attr}->{$value} )
    #             { print 'Error: ', $song->{'creator'}, ' had bogus attrvalue ',$attr,',',$value,"\n"; next; }
    #
    #             # Separate the covers into priority, and non-priority.
    #             my @priority_covers;
    #             my @covers;
    #             foreach my $target ( @{$song->{'fullArt'}->{$platform}->{$attr}->{$value}} )
    #             {
    #                 foreach my $key ( keys %{$target} )
    #                 {
    #                     my $hash = $target->{$key};
    #                     $hash->{'title'} = $key;
    #                     $hash->{'source'} = 'Mobygames';
    #
    #                     if( $key =~ /front/i )
    #                     {
    #                         push( @priority_covers, $hash );
    #                     } else {
    #                         push( @covers, $hash );
    #                     }
    #                 }
    #             }
    #
    #             push(@priority_covers, sort { $a->{'title'} cmp $b->{'title'} } @covers );
    #
    #             $song->{'art'} = \@priority_covers;
    #
    #             # Take the last one if it exists. (the last one will tend to catch more recent release dates, etc)
    #             # if( scalar @covers > 0 )
    #             # {
    #             #     my $pick = sort @covers
    #             #     $song->{'art'} = $covers[$#covers];
    #             #     next SONG;
    #             # }
    #         }
    #     }
    # }

    my $weight = 0;
    my @debug;

    my @covers = weight( $song->{'fullArt'}, [
      \%desired_platforms,
      \%desired_attributes,
      \%desired_values,
      \%desired_images,
    ]);

    # # Loop over platforms (level 1)
    # foreach my $platform ( keys %{$song->{'fullArt'}} )
    # {
    #     if( defined $desired_platforms{$platform} ) {
    #         $weight += $desired_platforms{$platform};
    #         push(@debug,[$platform,$desired_platforms{$platform}]);
    #     }
    #
    #     # Loop over attrs (level 2)
    #     foreach my $attr ( keys %{$song->{'fullArt'}->{$platform}} )
    #     {
    #         if( defined $desired_attributes{$attr} ) {
    #             $weight += $desired_attributes{$attr};
    #             push(@debug,[$attr,$desired_attributes{$attr}]);
    #         }
    #
    #         # Loop over values (level 3)
    #         foreach my $value ( keys %{$song->{'fullArt'}->{$platform}->{$attr}} )
    #         {
    #             if( defined $desired_values{$value} ) {
    #                 $weight += $desired_values{$value};
    #                 push(@debug,[$value,$desired_values{$value}]);
    #             }
    #
    #             # Loop over every set that matches these (level 4)
    #             foreach my $target ( @{$song->{'fullArt'}->{$platform}->{$attr}->{$value}} )
    #             {
    #                 # Loop over every art in that set (level 5)
    #                 foreach my $key ( keys %{$target} )
    #                 {
    #
    #                     # my $debugstring = "$key at $weight: ";
    #                     # foreach my $set (@debug)
    #                     # { $debugstring .= "$set->[1] @ $set->[0], "; }
    #                     # tracelog($game,$debugstring);
    #                 }
    #             }
    #         }
    #     }
    # }

    @covers = sort { $a->{'weight'} <=> $b->{'weight'} } @covers;

    if( scalar @covers > 5 )
    {
      $song->{'art'} = [@covers[0..4]];
    } else {
      $song->{'art'} = [@covers];
    }

}

map { delete $_->{'fullArt'} } @$playlist;

write_file('roster_new.json', encode_json($playlist)) || die $!;

if( defined $mapping && scalar keys %$mapping > 0 ) { write_file('nameMapping.json', encode_json($mapping)) || die $!; }

sub weight {
  my $ref = shift;
  my $weightings = shift;
  my $return = shift || [];
  my $weight = shift || 0;
  my $depth = shift || 0;
  my $last = shift || '';
  if( ref $ref eq 'HASH' )
  {
    if( defined $ref->{'thumbnail'} && defined $ref->{'fullsize'} )
    {
      # We've reached the bottom, and will now store the weighted entry.
      $ref->{'title'} = $last;
      $ref->{'source'} = 'Mobygames';
      $ref->{'weight'} = $weight;

      push(@$return,$ref);

      tracelog($ref->{'creator'},"$last at $weight");
    }
    else
    {
      foreach my $key ( keys %$ref )
      {

      }


      foreach my $key ( keys %$ref )
      {
        my $add = 0;
        if( defined $weightings->[$depth]->{$key} ) {
            $add = $weightings->[$depth]->{$key};
            # push(@debug,[$key,$desired_images{$key}]);
        }
        weight( $ref->{$key}, $weightings, $return, $weight+$add, $depth+1, $key );
      }
    }

  } elsif( ref $ref eq 'ARRAY' ) {
    # Just recurse
    foreach my $item ( @$ref )
    {
      weight( $item, $weightings, $return, $weight, $depth, $last );
    }
  } else {
    return;
  }

  return $return;
}

sub translate_game_to_url {
    my $game = shift;

    # Construct a friendly version of the URL
    $game =~ s/^the //;
    $game =~ s/[^\w -]//g; # Remove special characters that are not dashes or spaces.
    $game =~ s/ +/-/g; # Convert all consecutive spaces to one dash.
    $game = lc $game;

    return $game;
}

sub tracelog {
  if( $opt_trace )
  {
    my $song = shift;
    my $log = shift;
    print STDOUT "[$song]: $log\n";
  }
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
