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
  'Macintosh and Windows' => 8,
  'Windows' => 7,

  # Prefer Wii series and Playstation, as they tend to have square icons.
  'Wii' => 6,
  'Playstation' => 6,

  # Don't prefer Xbox, usually this ends up being box covers and Xbox has the most obtrusive ones.
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
    'United Kingdom' => 6,
    'Europe' => 6,
    'Japan' => 5,
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
    if( defined $opt_only && scalar @$opt_only > 0 && ! any {/$game/i} @$opt_only )
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
    my %unique_urls = ();

    # Generate a lookup hash of all cover shots, filed by platform, then by metadata attributes, then by shot type.
    COVER: while( scalar @covers > 0 )
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

            # If this thumbnail is not unique, skip.
            if( defined $unique_urls{$style} )
            { next COVER; }

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
    if( defined $opt_only && scalar @$opt_only > 0 && ! any {/$game/i} @$opt_only )
    { next; }

    # If we have already scanned this game this run, skip.
    if( defined $unique_arts{$game} )
    {
        if( $unique_arts{$game} != 0 )
        {
            $song->{'fullArt'} = $unique_arts{$game};
        }
        next SONG;
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
    ) { next SONG; }


    my $ret = weight( $song->{'fullArt'}, [
      \%desired_platforms,
      \%desired_attributes,
      \%desired_values,
      \%desired_images,
    ]);

    my @covers = sort { $b->{'weight'} <=> $a->{'weight'} } @$ret;


    # Dedupe by cover types
    my @fix;

    my %test;

    foreach my $item (@covers)
    {
        if( ! defined $test{$item->{'title'}} )
        {
          $test{$item->{'title'}}++;
          push(@fix,$item);
        }
    }

    # Dedupe URLs
    # my @fix;
    #
    # my %test;
    # foreach my $item (@covers)
    # {
    #     if( ! defined $test{$item->{'thumbnail'}} )
    #     {
    #       $test{$item->{'thumbnail'}}++;
    #       push(@fix,$item);
    #     }
    # }

    @covers = @fix;
    map {delete $_->{'weight'}} @covers;

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
  tracelog(join(',',$weight,$depth,$last));
  if( ref $ref eq 'HASH' )
  {
    if( defined $ref->{'thumbnail'} && defined $ref->{'fullsize'} )
    {
      # We've reached the bottom, and will now store the weighted entry.
      $ref->{'title'} = $last;
      $ref->{'source'} = 'Mobygames';
      $ref->{'weight'} = $weight;

      push(@$return,$ref);

      tracelog('',"$last at $weight");
    }
    else
    {
      foreach my $key ( keys %$ref )
      {
        # Grab every weighting that matches this key.
        my @matches = grep {/$key/i} keys %{$weightings->[$depth]};

        # Get the best.
        my $add = 0;
        if( scalar @matches > 0 )
        {
          @matches = sort {$weightings->[$depth]->{$b} <=> $weightings->[$depth]->{$a}} @matches;
          $add = $weightings->[$depth]->{$matches[0]};
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
    my $log = shift || '';
    print STDOUT "[$song]: $log\n";
  }
}

sub Usage {
    print <<EOF;
Cover art scanner for Aersia.
Usage: $0 [options]
	Options:

    --quiet or -q
        Suppress text (sometimes).

    --namemapping or -n
        When this flag is given and an entry is encountered that does not
        exist on the scanned database, it will ask for a proper name.
        This will be output to nameMapping.json for future runs.

    --clean or -c
        Removes all art entries from the roster, outputting roster_clean.json.

    --only or -o
        Case-insensitively selects certain entries to be processed. Can be specified multiple times.

		--force or -f
			  Does not skip entries that already have art, and re-does them.

    --reprocess or -r
        Only runs the second, post-scanning step. This is only useful when run over a fullArt version.
EOF
}
