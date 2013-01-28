require 'spec_helper'

describe InteractiveListParser do
  let(:json_filename) {"complete_list.json"            }
  let(:json_uri)      { sample_file_path json_filename }
  let(:sample_json)   { read_sample_file json_filename }

  
  describe "#initialize" do
    subject { InteractiveListParser.new }
    context "initial default context" do
      its(:interactives) { should have(0).items } 
      its(:groups)       { should have(0).items }

      its(:group_parser)       { should be GroupParser       }
      its(:interactive_parser) { should be InteractiveParser }
    end
  end

  describe "#parse" do
    subject do 
      parser = InteractiveListParser.new(json_uri)
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
        expect { InteractiveListParser.new(nil,"{}").parse }
        .to raise_error(ParsingError)
      end
    end
  end

  describe "#save_collections" do
    subject { InteractiveListParser.new }
    before :each do
      @mock = mock()
      @groups       = [@mock,@mock,@mock,@mock]
      @interactives = [@mock,@mock,@mock]
    end
    
    it "should call save on each group" do
      @mock.should_receive(:save).exactly(4).times
      subject.stub!(:groups).and_return(@groups)
      subject.save_collections
    end
    it "should call save on each interactive" do
      @mock.should_receive(:save).exactly(3).times
      subject.stub!(:interactives).and_return(@interactives)
      subject.save_collections
    end

  end

end