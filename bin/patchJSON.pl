#!/usr/bin/env perl
use strict;
use warnings;

# use WWW::Mechanize;
use JSON::MaybeXS;
use File::Slurp;
# use HTML::TreeBuilder::XPath;
# use Term::ProgressBar;
# use Getopt::Long;
# use List::Util qw/any/;

use Data::Dumper;
use HTML::Entities;

if( scalar @ARGV < 2 ) {
  die "Needs two arguments: the old JSON and the new JSON";
}

my $oldname = $ARGV[0];
my $newname = $ARGV[1];
my $overwrite_first = 5;

my $json = JSON::MaybeXS->new('utf8' => 1, 'pretty' => 1);

my $original = read_json($json,$oldname);
my $new = read_json($json,$newname);
my @patch = ();

# In case I copied this from the web browser, delete any "index" keys and un-HTML-encode the rest
foreach (@$original) { delete $_->{'index'}; decode_entities($_->{'creator'}); decode_entities($_->{'title'}); }
foreach (@$new) { delete $_->{'index'}; decode_entities($_->{'creator'}); decode_entities($_->{'title'}); }

# Overwrite the first few "songs", as they're not real
foreach my $i (0..$overwrite_first-1) {
  $original->[$i] = $new->[$i];
}

# Index the original
my %originalhash = ();
foreach my $song ( @$original ) {
  $originalhash{$song->{'creator'}.$song->{'title'}} = $song;
}

foreach my $song ( @$new ) {
  if( ! defined $originalhash{$song->{'creator'}.$song->{'title'}} ) {
    print STDOUT 'Adding song: '.$song->{'title'}.', by '.$song->{'creator'}."\n";
    push(@patch, $song);
  }
}

# Sort the new songs lexicographically, by creator, then title
@patch = sort {
  $a->{'creator'} cmp $b->{'creator'}
                  ||
    $a->{'title'} cmp $b->{'title'}
} @patch;

$original = [@$original,@patch];

write_file('roster.patched.json', $json->encode($original)) || die $!;

print "Playlist patched, output to roster.patched.json.\n";

sub read_json {
  my $json = shift;
  my $file = shift;
  print STDOUT "Decoding $file...\n";
  my $contents = read_file($file) || die $!;
  return $json->decode($contents);
}
