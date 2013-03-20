require 'spec_helper'

describe "Round Trip parsing" do

  describe "parsing a simple interactive, (one-atom)" do

    let(:interactive_file){ "interactives/basic-examples/one-atom.json" }
    let(:interactive_path){ sample_file_path interactive_file      }
    let(:model_file)      { "models/md2d/one-atom.json"            }
    let(:model_raw_hash)  do
      hash = JSON.parse(read_sample_file model_file)
      hash['from_import'] = true
      hash['id'] ="models_md2d_one-atom"
      hash["location"] = "http://localhost:3000/models/md2ds/models_md2d_one-atom.json"
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

    it "should generate the correct representation" do
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

  describe "parsing a more complex interactive (pendulum)" do
    let(:pendulum_interactive_path){ sample_file_path '/interactives/inquiry-space/1-pendulum.json' }

    it "should generate the correct representation" do
      interactive = Parsers::Interactive.new(pendulum_interactive_path,{'path' => "1-pendulum.json"}).parse()
      presenter   = Presenters::Interactive.new(interactive)
      # props is hash that will be the representation of the interactive.
      # it's converted to json and returned to the client via the API/ rails controller
      
      # This representation will include the properties of all model definitions embedded in the
      # definition of this interactive.
      props = presenter.runtime_properties
      
      props.should include({
        "about" => "",
        "publicationStatus" => "public",
        "subtitle" => "",
        "fontScale" => 0.8,
        "title" => "Pendulum"
      })

      props['models'].should include({
                                       "id" => "pendulum1$0",
                                       "type" => "md2d",
                                       "url" => "http://localhost:3000/models/md2ds/models_md2d_pendulum1_0.json",
                                       "viewOptions" => {
                                         "controlButtons" => "play_reset_step",
                                         "gridLines" => true,
                                         "showClock" => true,
                                         "velocityVectors" => {
                                           "length" => 10
                                         }
                                       },
                                       "modelOptions" => {
                                         "unitsScheme" =>  "mks",
                                         "timeStepsPerTick" => 167,
                                         "timeStep" =>  1,
                                         "modelSampleRate" => 60
                                       },
                                       "onLoad"=> [
                                                   "function resetAngle() {",
                                                   "  set({startingAngle: get('startingAngle')});",
                                                   "}",
                                                   "function stopMotion() {",
                                                   "  stop();",
                                                   "  setAtomProperties(1, { vx: 0, vy: 0 });",
                                                   "}",
                                                   "onPropertyChange('rodLength', resetAngle);",
                                                   "onPropertyChange('ballMass', resetAngle);",
                                                   "onPropertyChange('gravitationalField', resetAngle);",
                                                   "onPropertyChange('damping', resetAngle);",
                                                   "onPropertyChange('startingAngle', stopMotion);"
                                                  ]
                                     })
    end
  end
  
end
