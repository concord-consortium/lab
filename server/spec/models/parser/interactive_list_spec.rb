require 'spec_helper'

describe Parsers::InteractiveList do


  context "parse a simple list of interactives" do
    before(:each) do
      Parsers::InteractiveList.new(sample_file_path('simplest_list.json')).parse
    end

    it "should have one interactive" do
      Interactive.count.should == 1
    end
    it "should have one group" do
      Interactive.count.should == 1
    end
    it "should have one interactive model" do
      InteractiveModel.count.should == 1
    end
    it "should have one md2d " do
      Models::Md2d.count.should == 1
    end

    context "interactive" do
      subject{ Interactive.first}
      its(:title) { should == "Testing: Only One Atom"}
      its(:id) { should == "interactives_basic-examples_one-atom" }
      its(:path) { should == "/interactives/interactives_basic-examples_one-atom" }
      its(:publicationStatus) { should == "public"}
      it "should be in the correct group" do
        subject.group.name.should == "Basic Interactive Examples"
      end
      it "should have one interactive model" do
        subject.should have(1).interactive_models
      end
      context "interactive model" do
        subject { Interactive.first.interactive_models.first}
        its(:viewOptions) {  should == {"controlButtons"=>"play_reset", "enableAtomTooltips"=>true} }

        context "md2d" do
          subject {Interactive.first.interactive_models.first.md2d}
          its(:width){ should == 0.5 }
          its(:atoms){ should == {"x"=>[0.285], "y"=>[0.27], "vx"=>[0], "vy"=>[0], "charge"=>[0], "element"=>[0]} }
        end
      end
    end
  end

  context "parse a list of interactives with duplicate titles in a group" do
    subject do
      Parsers::InteractiveList.new(sample_file_path('duplicate_titles.json'))
    end

    it "#parse" do
      expect do
          subject.parse
      end.to raise_error(CouchRest::Model::Errors::Validations) {  |ve|
        ve.document.errors.full_messages.first.should =~ /title: 'Testing: Only One Atom' has already been taken in this group/
        ve.document.title.should =~ /Testing: Only One Atom/
      }
    end
  end

  # TODO: mark this as a 'slow' test
  context "interactives.json" do

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

      it "#parse" do
       expect do
         subject.parse
       end.to_not raise_error
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
end
