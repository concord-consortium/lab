require 'spec_helper'

describe Parsers::Models::Md2d do

  context ".new()" do
    it "should not parse without an id and url" do
      expect do
        Parsers::Models::Md2d.new()
      end.to raise_error(ArgumentError)
    end
  end

  context ".new(Dir.pwd, {'url' => '/some/path'})" do
    it "should not parse without a id" do
      expect do
        Parsers::Models::Md2d.new(Dir.pwd, { 'url' => "/some/path"})
      end.to raise_error(ArgumentError, "Missing id key in second argument")
    end
  end

  context ".new(Dir.pwd, {'id' => 'some_id'})" do
    it "should not parse without a url" do
      expect do
        Parsers::Models::Md2d.new(Dir.pwd, { 'id' => "some_id"})
      end.to raise_error(ArgumentError, "Missing url key in second argument")
    end
  end

  context ".new(<path to interactive json file>, <model hash constructed from interactive json file by Parsers::InteractiveModel>" do

    # This is how a model would be defined in an interactive json file
    let(:interactive_model_hash) { {'id' => 'one-atom', 'url' => 'models/md2d/one-atom.json', 'viewOptions'=>{'controlButtons'=>'play_reset'}} }

    let(:interactive_json_path) { File.path("#{Rails.root}/spec/sample_json/interactives/basic-examples/one-atom.json") }
    let(:model_json_path) { File.path("#{Rails.root}/spec/sample_json/models/md2d/one-atom.json") }

    # a Md2d parser will typically be created with the full path of the interactive json file that references it
    # and a hash built by the Parsers::InteractiveModel parser.
    subject { Parsers::Models::Md2d.new(interactive_json_path, interactive_model_hash) }

    it "#parse" do
      model = subject.parse
      model.from_import.should be_true
      model.url.should == 'models/md2d/one-atom.json'
      model.viewOptions['controlButtons'].should == "play_reset"
      model.width.should == 0.5
      model.height.should == 0.5
      model.elements['sigma'].should == [0.07]
     end
  end
end
