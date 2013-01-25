class GroupsController < ApplicationController

  def index
    @groups = Group.all
    render :json => @groups.collect { |g|
      { "_id" =>  g.id, 
        "name" => g.name, 
        "path" => g.path,
        "category" => g.category,
        "location" => groups_path(g) }
    }
  end

  def show
    @group = Group.get(params[:id])
    render :json => @group
  end

  def create
    @group = Group.new(params[:group])
    if @group.save
      render :json => @group, :status => :created, :location => @group
    else
      render :json => @group.errors, :status => :unprocessable_entity
    end
  end

end
