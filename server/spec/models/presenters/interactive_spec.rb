require 'spec_helper'

describe Presenters::Interactive do
  let(:fake_model) do
    obj = mock(
      :title => 'title',
      :path  => 'path',
      :subtitle => 'subtitle',
      :about => 'about',
      :publicationStatus => 'public',
      :group_id => 'group_id_is_key'
    )
    obj
  end

  subject { Presenters::Interactive.new(fake_model) }

  describe "group_listing" do
    let(:expected_hash) do
      {
        "about" => "about",
        "groupKey" => "group_id_is_key",
        "publicationStatus" => "public",
        "subtitle" => "subtitle",
        "title" => "title"
      }
    end
    its(:group_listing) { should include expected_hash}
  end


end