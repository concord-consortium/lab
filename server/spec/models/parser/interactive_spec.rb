require 'spec_helper'

describe Parsers::Interactive do
  let(:one_atom_meta_hash){ GeneratedInteractiveList.interactive_meta_hash('path', "interactives/basic-examples/one-atom.json") }
  # full path to interactives.json
  let(:interactives_file_path) { GeneratedInteractiveList.interactives_file_path}
  before(:all) do
    # create all the Interactive and Group hashes from the list of same, interactives.json file.
    GeneratedInteractiveList.create
  end

  # describe "interactive meta properties" do
  #   it "should have the correct interactive meta attributes" do
  #     interactive_meta_hash.should == {"title"=>"Testing: Only One Atom", "path"=>"interactives/basic-examples/one-atom.json", "groupKey"=>"basic-examples", "subtitle"=>"The MD2D model works with just a single atom also.", "about"=>"", "publicationStatus"=>"public"}
  #   end
  # end

  describe "#new(interactive_json_path, one_atom_meta_hash)" do
    subject { Parsers::Interactive.new(interactives_file_path, one_atom_meta_hash)}


    it "should have added two attributes to the meta data" do
      # added two key/values
      subject.data_hash.should == one_atom_meta_hash.merge("from_import"=>true, "staticExamplePath"=>"" )
    end

    it "should have the correct model parser" do
      subject.models_parser.should == Parsers::InteractiveModel
    end

    describe "methods used for parsing" do

      it "#uri_helper.set_relative_path" do
        subject.uri_helper.set_relative_path(subject.data_hash.fetch('path')).should == File.join(File.dirname(interactives_file_path), one_atom_meta_hash['path'])
      end

      it "should have a the correct full path to the interactive json file" do
        subject.uri_helper.set_relative_path(subject.data_hash.fetch('path'))
        subject.uri_helper.path.should == File.join(File.dirname(interactives_file_path), one_atom_meta_hash['path'])
      end

      it "generate_couch_doc_id" do
        subject.generate_couch_doc_id(subject.data_hash['path']).should == "interactives_basic-examples_one-atom"
      end

      it "#update_from_uri!" do
        subject.uri_helper.set_relative_path(subject.data_hash.fetch('path'))
        subject.update_from_uri!

        subject.generate_couch_doc_id(subject.data_hash['path']).should == "interactives_basic-examples_one-atom"
        subject.data_hash.should include("layout" => {"left"=>[["axes-label"], ["show-gridlines"], ["show-xunits"], ["show-yunits"], ["show-xlabel"], ["show-ylabel"]], "bottom"=>["current-obstacles", "kick-atom"]})

        subject.data_hash.should include("template" => [{"id"=>"left", "top"=>"3em", "right"=>"model.left", "padding-right"=>"0.5em", "align"=>"right"}, {"id"=>"bottom", "top"=>"model.bottom", "left"=>"model.left", "padding-top"=>"0.5em", "align"=>"center"}])

        subject.data_hash['models'].first.should == {"id"=>"one-atom", "type"=>"md2d", "url"=>"models/md2d/one-atom.json", "viewOptions"=>{"controlButtons"=>"play_reset", "enableAtomTooltips"=>true, "gridLines"=>false, "xunits"=>false, "yunits"=>false}}

        subject.data_hash['title'].should == "Testing: Only One Atom"
      end

      it "#set_group" do
        subject.set_group
        subject.data_hash['group_id'].should == one_atom_meta_hash['groupKey']
      end

      it "#add_models" do
        # get the full path of the file that defines this interactive
        subject.uri_helper.set_relative_path(subject.data_hash['path'])
        subject.update_from_uri!
        subject.add_models
        subject.data_hash["interactive_models"].first["from_import"].should == true
        subject.data_hash["interactive_models"].first["viewOptions"].should ==  {"controlButtons"=>"play_reset", "enableAtomTooltips"=>true, "gridLines"=>false, "xunits"=>false, "yunits"=>false}
        subject.data_hash["interactive_models"].first["type"].should == "InteractiveModel"
      end

      describe "#parse" do
        subject { Parsers::Interactive.new(interactives_file_path, one_atom_meta_hash).parse(one_atom_meta_hash) }
        its(:title) { should == "Testing: Only One Atom"}
        its(:subtitle) { should ==  "The MD2D model works with just a single atom also." }
        its(:publicationStatus) { should ==  "public" }
        its(:path) { should == "webapp/interactives/interactives_basic-examples_one-atom"}
        it "template" do
          subject.template.first.should == {"id"=>"left", "top"=>"3em", "right"=>"model.left", "padding-right"=>"0.5em", "align"=>"right"}
        end
        it "component" do
          subject.components.first.should == {"type"=>"numericOutput", "id"=>"current-obstacles", "property"=>"temperature", "displayValue"=>"return format('f')(value)"}
        end
        it "layout" do
          subject.layout.should == {"left"=>[["axes-label"], ["show-gridlines"], ["show-xunits"], ["show-yunits"], ["show-xlabel"], ["show-ylabel"]], "bottom"=>["current-obstacles", "kick-atom"]}
        end

        its(:fontScale) { should == 1.0}

        #   # this does the parsing using all of the above methods
        #   it "should have the full path of the interactive json" do
        #     subject.uri_helper.path.should == File.join(File.dirname(interactives_file_path), one_atom_meta_hash['path'])
        #   end
        #   it "should have the inter" do
        #     subject.data_hash['path'].should == "/interactives/interactives_basic-examples_one-atom"
        #     subject.data_hash.should include("layout" => {"left"=>[["axes-label"], ["show-gridlines"], ["show-xunits"], ["show-yunits"], ["show-xlabel"], ["show-ylabel"]], "bottom"=>["current-obstacles", "kick-atom"]})
        #     subject.data_hash.should include("template" => [{"id"=>"left", "top"=>"3em", "right"=>"model.left", "padding-right"=>"0.5em", "align"=>"right"}, {"id"=>"bottom", "top"=>"model.bottom", "left"=>"model.left", "padding-top"=>"0.5em", "align"=>"center"}])
        #     subject.data_hash['models'].first.should == {"id"=>"one-atom", "type"=>"md2d", "url"=>"models/md2d/one-atom.json", "viewOptions"=>{"controlButtons"=>"play_reset", "enableAtomTooltips"=>true, "gridLines"=>false, "xunits"=>false, "yunits"=>false}}
        #     subject.data_hash['title'].should == "Testing: Only One Atom"
        #     subject.data_hash['group_id'].should == one_atom_meta_hash['groupKey']
        #     subject.data_hash["interactive_models"].first["from_import"].should == true
        #     subject.data_hash["interactive_models"].first["viewOptions"].should ==  {"controlButtons"=>"play_reset", "enableAtomTooltips"=>true, "gridLines"=>false, "xunits"=>false, "yunits"=>false}
        #     subject.data_hash["interactive_models"].first["type"].should == "InteractiveModel"
        #   end
      end
    end
  end
end
