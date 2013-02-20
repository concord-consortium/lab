FactoryGirl.define do

  factory :interactive_model do
    from_import true
    # parameters
    # modelOptions
    # outputs
    # filteredOutputs
    factory :first_oilwater do
      viewOptions { {"controlButtons"=>"play_reset", "textBoxes"=>[{"text"=>"Separated Oil and Water", "x"=>1.08, "y"=>1.84, "layer"=>1, "frame"=>"rounded rectangle", "backgroundColor"=>"rgb(245,245,245)"}]} }
    end
  end
end
