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

use Data::Dumper;

# As these are all regular expressions, rather than strict matches,
# be careful. E.g. "Wii" will match "Wii" and "Wii U"
my %desired_platforms = (
  # Prefer PC as this will usually catch higher quality images.
  'Macintosh and Windows' => 8,
  'Windows' => 7,

  # Prefer original box art in most cases.
  'SNES' => 7,
  'NES' => 6,

  # Playstation tends to have nice square icons.
  'Playstation' => 5,

  # Don't prefer Wii, its art has odd whitespace and titles
  'Wii' => 2,

  # Don't prefer Xbox, usually this ends up being box covers and Xbox has the most obtrusive ones.
  'Xbox' => 1,

  # For mobile versions, these are usually good, but not as good as any existing PC versions.
  'i(Phone|Pad)' => 5,
  'Android' => 5,
);

my %desired_attributes = (
  'Packaging' => {
    # Prefer electronic for quality, keep case for authenticity, jewel case for aspect ratio.
    'Electronic' => 10,
    'Keep Case' => 9,
    'Jewel Case' => 8,
  },

  'Countr(y|ies)' => {
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

my %desired_titles = (
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

    my @rows = $tree->findnodes('//div[@id="main"]/div/div[last()]/div[@class!="pull-right"]');

    # Generate a lookup hash of all cover shots, indexed by URL.
    my %shots = ();
    ROW: while (scalar @rows > 0)
    {
        my $attrs = shift @rows;
        my $row = shift @rows;

        my %hash = ();

        # Grab the platform it's for
        my $descend = $attrs->look_down(_tag=>'h2');
        next if ! defined $descend; # excludes "covers" that don't have an actual title.
        $hash{'Platform'} = [($descend->content_list)[0]];

        # Grab all other related attributes.
        $hash{'Attributes'} = {};
        foreach my $tag ( $attrs->look_down(_tag=>'tr') )
        {
          my $key = (($tag->content_list)[0]->content_list)[0];
          $key =~ s/\x{a0}/ /g; #remove a unicode space

          # Support multiple values
          my @values = ($tag->content_list)[2]->content_list;

          # Filter out junk
          @values = grep {ref $_ eq 'HTML::Element'} @values;

          # Grab the actual content of each item.
          map { $_ = ($_->content_list)[0] } @values;

          $hash{'Attributes'}->{$key} = \@values;
        }

        foreach my $shot ( ($row->content_list)[0]->content_list ) # One element child of row, then everything below that is the art
        {
            if( ref $shot ne 'HTML::Element' ) { next; }

            # Grab the shot name, such as "Front Cover".
            my $title = (($shot->look_down( class => 'thumbnail-cover-caption' )->content_list)[0]->content_list)[0];
            $hash{'Title'} = $title; # put it in the weighting metadata too.

            # Grab its href.
            my $link = ($shot->look_down( class => 'thumbnail-image-wrapper' )->content_list)[0];

            # Add the title.
            # This is not necessary and can be generated from attributes.
            # my $title = $link->attr('title');
            # $shots{($type->content_list)[0]}->{'title'} = $title;

            # Add the thumbnail link, extracted from the background image.
            my $style = $link->attr('style');
            if( $style =~ /\(([^\)]+?)\)/ ) { $style = $1; }
            else { print "Error extracting thumbnail for $game"; }
            my $thumbnail = $style;

            # If this thumbnail is not unique, skip.
            if( defined $shots{$thumbnail} )
            { next ROW; }

            # Add the fullsize link, just replace s with l.
            if( $style =~ m,/s/, ) { $style =~ s,/s/,/l/,; }
            else { print "Error extracting fullsize for $game"; }
            my $fullsize = $style;

            #Store this shot.
            $shots{$thumbnail} = {
              'thumbnail' => $thumbnail,
              'fullsize' => $fullsize,
              'source' => 'Mobygames',
              'metadata' => \%hash,
              'title' => $title,
            };
        }
    }

    # Strip out the uniqueness-keys of thumbnail URLs when storing.
    my $fullart = [values %shots];

    $playlist->[$i]->{'art'} = $fullart;
    $unique_arts{$game} = $fullart;

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

SONG: foreach my $song ( @$playlist )
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
      $song->{'art'} = $unique_arts{$game};
    }
    next SONG;
  }
  # 
  # # If we're forcing, remove any art we've already processed for this item.
  # if( $opt_force )
  # { delete $song->{'art'}; }

  # Skip stuff at the front.
  if (
    $game eq 'Vidya Intarweb Playlist' ||
    $game =~ /^MOTD/ ||
    $game eq 'Changelog' ||
    $game eq 'Notice'
  ) { next SONG; }

  # If the game didn't get anything from MobyGames, skip.
  if( ! defined $song->{'art'} )
  {
    print "$game has no art.\n";
    next SONG;
  }

  my $root = 'metadata';

  foreach my $ref ( @{ $song->{'art'} } )
  {
    $ref->{$root}->{'weight'} = 0;
    tracelog($game,'Weighting art: '.Dumper($ref));

    # Check Platform keys
    tracelog($game,'Platform match:');
    if( defined $ref->{$root}->{'Platform'} )
    {
      my @matches;
      foreach my $v ( keys %desired_platforms )
      {
        tracelog($game, "Seeking matches for $v");
        foreach my $key ( @{$ref->{$root}->{'Platform'}} )
        {
          tracelog($game,"  Matching $v against $key");

          if( $key =~ /$v/i )
          {
            tracelog($game,"    Matched $v with $key, weight: ".$desired_platforms{$v});
            push(@matches, $v);
          }
        }
      }

      # Add in the best.
      if( scalar @matches > 0 )
      {
        @matches = sort {$desired_platforms{$b} <=> $desired_platforms{$a}} @matches;
        tracelog($game,'Adding '.$desired_platforms{$matches[0]}.' weight.');
        $ref->{$root}->{'weight'} += $desired_platforms{$matches[0]};
      }
    }

    # Check Title keys
    tracelog($game,'Title match:');
    if( defined $ref->{$root}->{'Title'} )
    {
      my @matches;
      foreach my $v ( keys %desired_titles )
      {
        tracelog($game,"Matching $v against ".$ref->{$root}->{'Title'});
        if( $ref->{$root}->{'Title'} =~ /$v/i )
        {
          tracelog($game,"  Matched $v with ".$ref->{$root}->{'Title'}.", weight: ".$desired_titles{$v});
          push(@matches, $v);
        }
      }

      # Add in the best.
      if( scalar @matches > 0 )
      {
        @matches = sort {$desired_titles{$b} <=> $desired_titles{$a}} @matches;
        tracelog($game,'Adding '.$desired_titles{$matches[0]}.' weight.');
        $ref->{$root}->{'weight'} += $desired_titles{$matches[0]};
      }
    }

    # Check Attributes
    tracelog($game,'Attributes match:');
    if( defined $ref->{$root}->{'Attributes'} )
    {
      # two-level hash match
      my @matches;
      my %two;
      foreach my $da ( keys %desired_attributes )
      {
        tracelog($game,"Seeking matches for $da");
        foreach my $key ( keys %{$ref->{$root}->{'Attributes'}} )
        {
          tracelog($game,"  Matching $da against $key");
          if( $key =~ /$da/i )
          {
            tracelog($game,"    Matched $da with $key");
            foreach my $subda ( keys %{$desired_attributes{$da}} )
            {
              tracelog($game,"    $key: Seeking matches for $subda");
              foreach my $subkey ( @{$ref->{$root}->{'Attributes'}->{$key}} )
              {
                tracelog($game,"    $key: Matching $subda against $subkey");
                if( $subkey =~ /$subda/i )
                {
                  tracelog($game,"      $key: Matched $subda with $subkey, weight: ".$desired_attributes{$da}->{$subda});
                  push( @matches, [$da,$subda,$key,$subkey] );
                }
              }
            }
          }
        }
      }

      # Add in the best.
      if( scalar @matches > 0 )
      {
        @matches = sort {$desired_attributes{$b->[0]}->{$b->[1]} <=> $desired_attributes{$a->[0]}->{$a->[1]}} @matches;
        tracelog($game,'Adding '.$desired_attributes{$matches[0]->[0]}->{$matches[0]->[1]}.' weight.');
        $ref->{$root}->{'weight'} += $desired_attributes{$matches[0]->[0]}->{$matches[0]->[1]};
      }
    }
  }

  tracelog($game,"Cover weighting complete. Ranking:\n".Dumper($song->{'art'}));

  # Take only the best of each cover type.
  my @fix;
  my %test;
  $song->{'art'} = [sort { $b->{'metadata'}->{'weight'} <=> $a->{'metadata'}->{'weight'} } @{$song->{'art'}}];

  foreach my $item ( @{ $song->{'art'} } )
  {
    if( ! defined $test{$item->{'title'}} )
    {
      $test{$item->{'title'}}++;
      push(@fix,$item);
    }
  }

  tracelog($game,"Deduplication complete. Ranking:\n".Dumper(\@fix));

  $song->{'art'} = \@fix;

  if( scalar @{$song->{'art'}} > 5 )
  {
    $song->{'art'} = [$song->{'art'}->[0..4]];
  }

  tracelog($game,"Trimmed to 5. Ranking:\n".Dumper($song->{'art'}));

  map { delete $_->{'metadata'} } @{ $song->{'art'} };
}

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
        Only runs the second, post-scanning step. This is only useful when changing weights or weighting algorithms.
EOF
}
