require 'spec_helper'

describe Parsers::InteractiveList do
  let(:json_filename) {"complete_list.json"            }
  let(:json_uri)      { sample_file_path json_filename }
  let(:sample_json)   { read_sample_file json_filename }

  
  describe "#initialize" do
    subject { Parsers::InteractiveList.new }
    context "initial default context" do
      its(:interactives) { should have(0).items } 
      its(:groups)       { should have(0).items }

      its(:group_parser)       { should be Parsers::Group       }
      its(:interactive_parser) { should be Parsers::Interactive }
    end
  end

  describe "#parse" do
    subject do 
      parser = Parsers::InteractiveList.new(json_uri)
      interactive_parser_class = mock(:new => mock(:parse => nil))
      parser.interactive_parser = interactive_parser_class
      parser.parse
    end
    
    context "a simple list with valid interactive definitions in it" do
      # as of Jan 2013 ~95 interactives
      its(:interactives) { should have_at_least(90).items } 
    end

    context "a list which is missing interactives" do
      it "should throw an exception" do
        expect { Parsers::InteractiveList.new(nil,"{}").parse }
        .to raise_error(Parsers::ParsingError)
      end
    end
  end

end