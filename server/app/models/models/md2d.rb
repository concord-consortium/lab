module Models
  class Md2d < BaseDataObject
    # attr_accessor :casted_by

    property :name,                 String
    property :url,                  String
    property :temperature,          Float
    property :coulomb_forces,       Float
    property :epsilon,              Float
    property :sigma,                Float
    property :height,               Float
    property :width,                Float

    property :lennard_jones_forces, TrueClass
    property :temperature_control,  TrueClass

    property :atoms,                Object
    property :elements,             Object
    property :viewOptions,          Object

    timestamps!

    design do
      view :by_name
      view :by_id
    end

    alternate_id :url

  end
end