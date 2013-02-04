module Models
  class Md2d < BaseDataObject
    # attr_accessor :casted_by

    property :name,                 String
    property :url,                  String
    property :local_ref_id,         String

    # these are all in the generated models
    property :height,                           Float
    property :width,                            Float
    property :lennard_jones_forces,             TrueClass
    property :coulomb_forces,                   TrueClass
    property :temperature_control,              TrueClass
    property :gravitationalField,               Float
    property :timeStep,                         Float
    property :dielectricConstant,               TrueClass
    property :realisticDielectricEffect,        TrueClass
    property :solventForceFactor,               Float
    property :solventForceType,                 Float
    property :additionalSolventForceThreshold,  Float
    property :polarAAEpsilon,                   Float
    property :viscosity,                        Float
    property :viewRefreshInterval,              Float

    # these are all objects in the generated models
    property :viewOptions,                      Object
    property :pairwiseLJProperties,             Object
    property :elements,                         Object
    property :atoms,                            Object
    property :obstacles,                        Object
    property :radialBonds,                      Object
    property :angularBonds,                     Object
    property :restraints,                       Object
    property :geneticProperties,                Object
    property :textBoxes,                        Object

    timestamps!

    design do
      view :by_name
      view :by_id
    end

    alternate_id :url

  end
end