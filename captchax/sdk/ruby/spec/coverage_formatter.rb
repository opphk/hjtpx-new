require 'simplecov'
require 'simplecov-lcov'

SimpleCov.start do
  add_filter '/spec/'
  add_filter '/vendor/'

  minimum_coverage 80

  track_files 'lib/**/*.rb'

  SimpleCov::Formatter::HTMLFormatter
  SimpleCov::Formatter::LcovFormatter
end

if ENV['COVERAGE'] == 'lcov'
  SimpleCov.formatter = SimpleCov::Formatter::LcovFormatter
else
  SimpleCov.formatter = SimpleCov::Formatter::MultiFormatter.new([
    SimpleCov::Formatter::HTMLFormatter,
    SimpleCov::Formatter::LcovFormatter
  ])
end
