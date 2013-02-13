require 'spec_helper'

describe Parsers::Base do
  subject do
    Parsers::Base.new()
  end

  context ".new" do
    
    it "#parse" do
      # simply returns it's internal data hash
      subject.parse.should == {"from_import" => true}
    end

    it "#update_data!" do
      # simply merges in it's hash argument if there is one
      subject.update_data!.parse.should == {"from_import" => true}
    end

    it "#update_data!(:foo => 'bar')" do
      # simply merges in it's hash argument if there is one
      subject.update_data!({'foo' => 'bar'}).parse.should == {"from_import" => true, 'foo' => 'bar'}
    end

    it "#update_data!(nil) should raise an exception" do
      expect do
        subject.update_data!([]).parse.should == {"from_import" => true}
      end.to raise_error(ArgumentError)
    end

    it "#update_from_hash!({:foo =>'bar'})" do
      subject.update_from_hash!({'foo' => 'bar'}).parse.should == {"from_import" => true, 'foo' => 'bar'}      
    end

    it "#update_from_hash!(nil) should raise an exception" do
      expect do
        subject.update_from_hash!(nil)
      end.to raise_error(ArgumentError)
    end
    
    it "#update_from_json!('{\"foo\":\"bar\"'})" do
      subject.update_from_json!("{\"foo\":\"bar\"}").parse.should == {"from_import" => true, 'foo' => 'bar'}
    end

    it "#update_from_json!('im not json') should raise an exception" do
      expect do
        subject.update_from_json!("im not json")
      end.to raise_error(Parsers::ParsingError)
    end
  end

  context ".new('simplest_list_of_interactives.json', {...}) with a second argument" do
    subject { Parsers::Base.new(sample_file_path('simplest_list.json'), { "interactives"=>[{"title"=>"Some Title"}]}) }

    it "#update_from_uri! the constructor data hash arg does NOT overwrite the json file contents" do
      subject.update_from_uri!
      subject.parse.should == {"from_import"=>true, "interactives"=>[{"title"=>"Testing: Only One Atom", "path"=>"interactives/basic-examples/one-atom.json", "groupKey"=>"basic-examples", "subtitle"=>"The MD2D model works with just a single atom also.", "about"=>"", "publicationStatus"=>"public"}], "groups"=>[{"path"=>"basic-examples", "name"=>"Basic Interactive Examples", "category"=>"Examples"}]}
    end

    it "#update_from_uri! the constructor data hash arg does NOT add key/values" do
      base_parser =  Parsers::Base.new(sample_file_path('simplest_list.json'), { "interactives"=>[{"titleXXXXX"=>"Some Title"}]} )
      base_parser.update_from_uri!
      base_parser.parse.should == {"from_import"=>true, "interactives"=>[{"title"=>"Testing: Only One Atom", "path"=>"interactives/basic-examples/one-atom.json", "groupKey"=>"basic-examples", "subtitle"=>"The MD2D model works with just a single atom also.", "about"=>"", "publicationStatus"=>"public"}], "groups"=>[{"path"=>"basic-examples", "name"=>"Basic Interactive Examples", "category"=>"Examples"}]}
    end

    it "#update_from_uri! the constructor data hash arg does NOT add key/values" do
      base_parser =  Parsers::Base.new(sample_file_path('simplest_list.json'), { "groups"=>[{"another_path"=>"NOTBASIC-EXAMPLES", "another_name"=>"NOT BASIC INTERACTIVE EXAMPLES", "another_category"=>"NOT EXAMPLES"}]})
      base_parser.update_from_uri!
      base_parser.parse.should == {"from_import"=>true, "interactives"=>[{"title"=>"Testing: Only One Atom", "path"=>"interactives/basic-examples/one-atom.json", "groupKey"=>"basic-examples", "subtitle"=>"The MD2D model works with just a single atom also.", "about"=>"", "publicationStatus"=>"public"}], "groups"=>[{"path"=>"basic-examples", "name"=>"Basic Interactive Examples", "category"=>"Examples"}]}
    end

  end

  context ".new('simplest_list_of_interactives.json')" do
    subject { Parsers::Base.new(sample_file_path('simplest_list.json')) }
    it "#update_from_uri!" do
      subject.update_from_uri!
      subject.parse.should == {"from_import"=>true, "interactives"=>[{"title"=>"Testing: Only One Atom", "path"=>"interactives/basic-examples/one-atom.json", "groupKey"=>"basic-examples", "subtitle"=>"The MD2D model works with just a single atom also.", "about"=>"", "publicationStatus"=>"public"}], "groups"=>[{"path"=>"basic-examples", "name"=>"Basic Interactive Examples", "category"=>"Examples"}]}
    end

    it "#parse_entity({'foo' => 'bar'}, Parsers::Base)" do
      # ignores contents of the file
      subject.parse_entity({'foo' => 'bar'}, Parsers::Base).should == {"from_import"=>true, "foo"=>"bar"}
    end

    it "#parse_entity({'foo' => 'bar'}, Parsers::Interactive) should not raise an ArgumentException" do
      expect do
        subject.parse_entity({'foo' => 'bar'}, Parsers::Interactive).should == {"from_import"=>true, "foo"=>"bar"}
      end.to_not raise_error(ArgumentError)
      # This may raise an expection from the Parser::Interactive 
    end

    it "#parse_entity({'foo' => 'bar'}, nil) should raise an exception" do
      expect do
        subject.parse_entity({'foo' => 'bar'}, nil).should == {"from_import"=>true, "foo"=>"bar"}
      end.to raise_error
    end

    it "#parse_entity(nil, Parsers::Base) should raise an exception" do
      expect do
        subject.parse_entity(nil, Parsers::Base)
      end.to raise_error(ArgumentError)
    end

    it "#parse_collection('groups', collection, Parsers::Groups)" do
      subject.update_from_uri!
      collection = subject.parse_collection('groups', [], Parsers::Group)
      collection.should have(1).items
      collection.first.from_import.should == true
      collection.first.name.should == "Basic Interactive Examples"
      collection.first.path.should == "basic-examples"
      collection.first.category.should == "Examples"
      
    end
  end

  context ".new('no_such_file.json')" do
    subject { Parsers::Base.new(sample_file_path('no_such_file.json'))}
    it "#update_from_uri! with a non-existing file will raise an exception" do
      expect do
        subject.update_from_uri!
      end.to raise_error(Errno::ENOENT)
    end
  end
end
