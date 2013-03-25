FactoryGirl.define do

  sequence :title do |n|
    "title #{n}"
  end

  factory :interactive do
    outputs []
    filteredOutputs []
    parameters []
    from_import true

    factory :oil_and_water do
      title "Oil and Water"
      publicationStatus 'public'
      subtitle "Explore how polar and non-polar substances interact."
      path "/interactives/interactives_samples_1-oil-and-water-shake"
      staticExamplePath ""
      about "It is well known that"
      layout { {"bottom"=>["shake"]} }
      components { [{"type"=>"button",
                      "id"=>"shake",
                      "text"=>"Shake up the oil and water mixture",
                      "action"=>"loadModel('oilAndWaterMix');"}]}
      # interactive_models
      after(:create) do |interactive, evaluator|
        interactive.group_id = FactoryGirl.create_list(:samples, 1).first.id
      end
      after(:create) do |interactive, evaluator|
        interactive.interactive_models = FactoryGirl.create_list(:first_oilwater, 1)
      end
    end

  end
end
