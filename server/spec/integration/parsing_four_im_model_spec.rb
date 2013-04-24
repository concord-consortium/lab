require 'spec_helper'

describe "Interactive with four ids referencing one model" do
  let(:svg_images_meta_hash){ GeneratedInteractiveList.interactive_meta_hash('path',"interactives/layout-tests/svg-images.json") }

  # full path to interactives.json
  let(:interactives_file_path) { GeneratedInteractiveList.interactives_file_path}

  before(:all) do
    # create all the Interactive and Group hashes from the list of same, interactives.json file.
    GeneratedInteractiveList.create
  end
  subject do
    interactive = Parsers::Interactive.new(interactives_file_path, svg_images_meta_hash).parse
    Presenters::Interactive.new(interactive)
  end

  it "should have the correct model ids" do
    ids = %w{png svg1 svg2 svg3}
    subject.runtime_properties['models'].each_with_index do |m, i|
      m['id'].should == ids[i]
    end
  end
  it "should all reference the same model" do
    subject.runtime_properties['models'].each do |m|
      m['url'].should == "http://localhost:3000/models/md2ds/imports_legacy-mw-content_converted_layout-tests_svg-images_page1_0.json"
    end
  end
end
