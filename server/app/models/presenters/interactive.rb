module Presenters
  class Interactive < Base
    attr_accessor :interactive

    def initialize(_interactive)
      self.interactive = _interactive
    end

    def json_listing
      HashProperties.new(self.interactive).hash_value do |p|
        p.add('id')
        p.add('title')
        p.add('path')
        p.set('groupKey',self.interactive.group_id)
        p.add('subtitle')
        p.add('about')
        p.add('publicationStatus')
        p.set('location',self.json_path)
        p.set('preview',self.preview_path)
      end
    end

    def group_listing
      HashProperties.new(self.interactive).hash_value do |p|
        p.add('title')
        p.add('path')
        p.set('groupKey',self.interactive.group_id)
        p.add('subtitle')
        p.add('about')
        p.add('publicationStatus')
      end
    end

    def runtime_properties
      HashProperties.new(self.interactive).hash_value do |p|
        p.set('groupKey',self.interactive.group_id)
        p.add('title')
        p.add('from_import')
        p.add('publicationStatus')
        p.add('subtitle')
        p.add('about')
        p.add('components')
        p.add('layout')
        p.add('outputs')
        p.add('filteredOutputs')
        p.add('parameters')
        p.set('models',self.model_summary)
      end
    end

    def model_summary
      self.interactive.interactive_models.map do |m|
        Presenters::InteractiveModel.new(m).interactive_properties
      end
    end

    def json_path
      url_helper.interactive_url(self.interactive, :host => self.hostname, :format => :json)
    end

    def preview_path
      path = url_helper.interactive_path(self.interactive)
      "http://#{self.hostname}/interactives.html##{path}.json"
    end
  end
end
