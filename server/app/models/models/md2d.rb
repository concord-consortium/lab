module Models
  class Md2d < BaseDataObject
    # attr_accessor :casted_by
    # see: ./server/public/lab-amd/md2d/models/metadata.js  for details

    property :name,                 String
    property :url,                  String
    property :local_ref_id,         String

    # these are all in the generated models
    property :height,                           Float
    property :width,                            Float
    property :lennardJonesForces,               TrueClass
    property :coulombForces,                    TrueClass
    property :temperatureControl,               TrueClass
    property :gravitationalField,               Float
    property :timeStep,                         Float
    property :dielectricConstant,               TrueClass
    property :realisticDielectricEffect,        TrueClass
    property :solventForceFactor,               Float
    property :solventForceType,                 Float
    property :additionalSolventForceThreshold,  Float
    property :additionalSolventForceMult,       Float
    property :polarAAEpsilon,                   Float
    property :viscosity,                        Float
    property :viewRefreshInterval,              Float
    property :targetTemperature,                Float

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

    # these are being defined in some models, but are probably
    # deprication worthy?
    property :onLoad,                           Object # 25 found in importing
    property :modelOptions,                     Object #  5 found by importing

    timestamps!

    design do
      view :by_name
      view :by_id
    end

    alternate_id :url

  end
end