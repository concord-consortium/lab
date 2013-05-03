require 'spec_helper'

describe "Interactive with four ids referencing one model" do
  let(:svg_images_meta_hash){ GeneratedInteractiveList.interactive_meta_hash('path',"interactives/layout-tests/svg-images.json") }

  # full path to interactives.json
  let(:interactives_file_path) { GeneratedInteractiveList.interactives_file_path}

  before(:all) do
    # create all the Interactive and Group hashes from the list of same, interactives.json file.
    GeneratedInteractiveList.create
  end

  describe "#new(interactive_json_path, svg_images_meta_hash)" do
    subject { Parsers::Interactive.new(interactives_file_path, svg_images_meta_hash)}

    describe "methods used for parsing" do

      it "should have a the correct full path to the interactive json file" do
        subject.uri_helper.set_relative_path(subject.data_hash.fetch('path'))
        subject.uri_helper.path.should == File.join(File.dirname(interactives_file_path), svg_images_meta_hash['path'])
      end

      it "generate_couch_doc_id" do
        subject.generate_couch_doc_id(subject.data_hash['path']).should == "interactives_layout-tests_svg-images"
      end

      describe "#parse" do
        subject { Parsers::Interactive.new(interactives_file_path, svg_images_meta_hash).parse(svg_images_meta_hash) }
        its(:title) { should == "Replacing Bitmap Images with SVG" }
        its(:subtitle) { should ==  "Experiments replacing bitmap images with SVG documents to preserve quality when scaled up."}
        its(:publicationStatus) { should ==  "public" }
        # its(:about) { should =~ /This Interactive displays an image with a suggestion for how to start using the Interactive/ }
        its(:path) { should == "webapp/interactives/interactives_layout-tests_svg-images" }

        describe "the interactive models" do
          it "should have four InteractiveModel " do
            subject.should have(4).interactive_models
          end

          it "should have interactive models with the correct image mappings" do
            subject.interactive_models.first.viewOptions['imageMapping'].should be_nil
            subject.interactive_models.second.viewOptions['imageMapping'].should == {"instructionBox.png"=>"instructionBox.svg"}
            subject.interactive_models.third.viewOptions['imageMapping'].should ==  {"instructionBox.png"=>"instructionBox2.svg"}
            subject.interactive_models.last.viewOptions['imageMapping'].should ==  {"instructionBox.png"=>"instructionBox3.svg"}
          end

          it "should have interactive models with the correct local_ref_id" do
            subject.interactive_models.first.local_ref_id.should == 'png'
            subject.interactive_models.second.local_ref_id.should == "svg1"
            subject.interactive_models.third.local_ref_id.should == "svg2"
            subject.interactive_models.last.local_ref_id.should == "svg3"
          end

          it "should have models with the same url" do
            subject.interactive_models.map(&:md2d).each do |model|
              model.url.should == "imports/legacy-mw-content/converted/layout-tests/svg-images/page1$0.json"
            end
          end
          it "should have models with the same id" do
            subject.interactive_models.map(&:md2d).each do |model|
              model.id.should == "imports_legacy-mw-content_converted_layout-tests_svg-images_page1_0"
            end
          end
        end
      end
    end
  end
end
