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

    # get the path for the model's json file
    it "#adapt_url with a relative path" do
      # the model's path is relative to the same base path, spec/sample_json, used by
      # the interactive json file that references it iff the interactive defined the model's url without a leading slash
      # i.e. 'models' => [{ 'url' => 'models/md2d/one-atom.json' }]

      model_path = "#{Rails.root}/spec/sample_json/interactives/basic-examples/../../#{interactive_model_hash['url']}"
      # set the model parser's uri_helper.path, this will be used to load the model's json file
      subject.adapt_url(interactive_model_hash['url']).should == model_path
      subject.uri_helper.path.should == model_path
    end

    # get the path for the model's json file
    it "#adapt_url without a relative path" do
      # the model's path is relative to the public directory iff the
      # interactive json defined the model's url WITH a leading slash
      # i.e. 'models' => [{ 'url' => '/imports/legacy-mw-content/converted/new-examples-for-nextgen/simple-gas$0.json' }]

      subject.uri_helper.path = "#{Rails.root}/public/examples/interactives/interactives/basic-examples/atom-tracing.json"

      # set the model parser's uri_helper.path, this will be used to load the model's json file
      subject.adapt_url("/imports/legacy-mw-content/converted/new-examples-for-nextgen/simple-gas$0.json").should == "#{Rails.root}/public//imports/legacy-mw-content/converted/new-examples-for-nextgen/simple-gas$0.json"

      subject.uri_helper.path.should == "#{Rails.root}/public//imports/legacy-mw-content/converted/new-examples-for-nextgen/simple-gas$0.json"
    end
    it "#generate_local_ref_id" do
      subject.generate_local_ref_id.should == 'one-atom'
    end

    it "#parse" do
      model = subject.parse
      model.from_import.should be_true
      model.url.should == 'models/md2d/one-atom.json'
      model.local_ref_id.should == 'one-atom'
      model.id.should == 'models_md2d_one-atom'
      model.viewOptions['controlButtons'].should == "play_reset"
      model.width.should == 0.5
      model.height.should == 0.5
      model.elements.first['sigma'].should == 0.07
     end
  end
end
