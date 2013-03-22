require 'spec_helper'

describe Parsers::InteractiveList do

  context "#update_from_uri!" do
    
    subject do
      parser = Parsers::InteractiveList.new(File.join(Rails.root,"public","examples","interactives","interactives.json"))
      parser.update_from_uri!
      parser
    end
    # TODO: parse the interactive for the correct number of interactives for each
    # publicationState by reading the interactives.json file directory.
    # grep '"publicationStatus": "broken"' interactives.json | wc -l
    
    it "should have a large set of interactives" do
      subject.data_hash['interactives'].size.should > 300
    end

    context "#remove_broken_interactives" do
      it "should remove broken interactives " do
        orig_size = subject.data_hash['interactives'].size
        subject.remove_broken_interactives
        subject.data_hash['interactives'].size.should < (orig_size - 10)
      end
    end
  end
end
