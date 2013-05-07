class InteractivesController < ApplicationController

  def index
    groups = Group.correct_order.collect do |g|
       Presenters::Group.new(g).json_listing
    end
    interactives = Interactive.all.collect do |i|
       presenter(i).json_listing
    end
    render :json => {
      'interactives'  => interactives,
      'groups'        => groups
    }
  end

  def show
    render :json => presenter.runtime_properties
  end

  def group_list
    interactives = Interactive.all.collect do |i|
       presenter(i).group_listing
    end
    render :json => interactives
  end

  def create
    group = Group.find(params[:interactive][:groupKey])
    create_path_and_id(group)

    @interactive = Interactive.new(params[:interactive])
    @interactive.group = group

    interactive_model = create_interactive_model
    @interactive.interactive_models << interactive_model

    if @interactive.save
      render({
        :json     => presenter(@interactive).runtime_properties,
        :status   => :created,
        :location => interactive_path(@interactive)
      })
    else
      render({
        :json => @interactive.errors.messages,
        :status => :unprocessable_entity
      })
    end
  end

  def update
    @interactive = Interactive.find(params[:id])

    if @interactive.update_attributes(params[:interactive]) &&  @interactive.update_interactive_models(params[:interactive][:models])
      render({
        :json     => presenter(@interactive).runtime_properties,
        :status   => :created,
        :location => interactive_path(@interactive)
      })
    else
      render({
        :json => @interactive.errors,
        :status => :unprocessable_entity
      })

    end
  end

  private
  def presenter(model=nil)
    model ||= Interactive.get(params[:id])
    Presenters::Interactive.new(model)
  end

  # TODO: refactor this and Parsers#Interactive#generate_couch_doc_id
  # into the Interactive model
  def create_path_and_id(group)
    groupKey = group.path.gsub('/','_')
    title = params[:interactive][:title].gsub(' ', '_')

    params[:interactive][:id] = "interactives_#{groupKey}_#{title}"
    params[:interactive][:path] = "webapp/interactives/#{params[:interactive][:id]}"

  end

  def create_interactive_model
    interactive_model = InteractiveModel.new(:viewOptions => params[:interactive][:models].first[:viewOptions],
                                             :local_ref_id => params[:interactive][:models].first[:id],
                                             :parameters => params[:interactive][:parameters],
                                             :outputs => params[:interactive][:outputs],
                                             :filteredOutputs => params[:interactive][:filteredOutputs])
    interactive_model.md2d = create_model
    interactive_model.save!
    interactive_model
  end

  def create_model
    orig_model_url = params[:interactive][:models].first[:url]
    model_id = orig_model_url.split('/').last.gsub('.json','')
    old_model = Models::Md2d.find(model_id)
    old_model.clone! do |m|
      m.from_import = false
      m.name = nil
      m.url = ::Models::Md2d.generate_url(m.id)
    end
  end
end
