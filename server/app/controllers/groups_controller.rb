class GroupsController < ApplicationController

  def index
    render :json => Group.all.map { |g|
      presenter(g).json_listing
    }
  end

  def show
    render :json => presenter.json_listing
  end


  def create
    @group = Group.new(params[:group])
    if @group.save
      render :json => @group, :status => :created, :location => @group
    else
      render :json => @group.errors, :status => :unprocessable_entity
    end
  end

  private
  def presenter(model=nil)
    model ||= Group.get(params[:id])
    Presenters::Group.new(model)
  end


end
