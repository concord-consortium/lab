require 'spec_helper'

describe "Round Trip parsing" do

  describe "parsing a known interactive" do

    let(:interactive_file){ "interactives/basic-examples/one-atom.json" }
    let(:interactive_path){ sample_file_path interactive_file      }
    let(:model_file)      { "models/md2d/one-atom.json"            }
    let(:model_raw_hash)  do
      hash = JSON.parse(read_sample_file model_file)
      hash['from_import'] = true
      hash
    end

    let(:interactive_hash) do
      JSON.parse(read_sample_file interactive_file)
    end

    # Merge in the viewOptions for each model spec
    let(:view_options) do
      interactive_hash['models'][0]['viewOptions']
    end

    let(:model_hash)      do
      (model_raw_hash['viewOptions'] = view_options) if view_options
      model_raw_hash
    end

    it "should have matching interactive hash" do
      interactive = Parsers::Interactive.new(interactive_path,{'path' => "one-atom.json"}).parse()
      presenter   = Presenters::Interactive.new(interactive)
      props = presenter.runtime_properties

      props.should include({
        "about" => "",
        "publicationStatus" => "public",
        "subtitle" => "The MD2D model works with just a single atom also.",
        "title" => "Testing: Only One Atom"
      })

      props['models'].should include({
        "id" => "one-atom",
        "type" => "md2d",
        "url" => "http://localhost:3000/models/md2ds/models_md2d_one-atom.json",
        "viewOptions" => {
          "controlButtons" => "play_reset",
          "enableAtomTooltips" => true
        }
      })

      props['components'].should include({
        "displayValue" => "return format('f')(value)",
        "id" => "current-obstacles",
        "property" => "temperature",
        "type" => "numericOutput"
      })

      props['components'].should include({
        "action" => [
          "var atom = getAtomProperties(0);",
          "atom.vx += (Math.random()*2-1)*1e-4;",
          "atom.vy += (Math.random()*2-1)*1e-4;",
          "setAtomProperties(0, { vx: atom.vx, vy: atom.vy });"
        ],
        "id" => "kick-atom",
        "text" => "Kick Atom",
        "type" => "button"
      })

    end

    it "should have matching models hashes" do
      interactive = Parsers::Interactive.new(interactive_path,  {'path' => "one-atom.json"}).parse()
      interactive.interactive_models.each do |im|
        presenter   = Presenters::Models::Md2d.new(im.md2d)
        presenter.runtime_properties.should == model_hash        
      end
    end
  end

end
