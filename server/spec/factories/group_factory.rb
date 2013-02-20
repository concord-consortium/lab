FactoryGirl.define do

  factory :group do
    from_import true

    factory :samples do
      name "Samples"
      path "samples"
      category "Samples"
    end
  end
end
