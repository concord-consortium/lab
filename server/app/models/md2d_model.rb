class Md2dModel < CouchRest::Model::Base
  attr_accessor :casted_by

  property :name,                 String

  property :temperature,          Float
  property :coulomb_forces,       Float
  property :epsilon,              Float
  property :sigma,                Float

  property :lennard_jones_forces, TrueClass
  property :temperature_control,  TrueClass

  property :atoms,                Hash
  property :elements,             Array

  timestamps!

end
