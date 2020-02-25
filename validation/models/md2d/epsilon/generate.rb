require 'fileutils'     # http://www.ruby-doc.org/stdlib-1.9.3/libdoc/fileutils/rdoc/index.html
require 'matrix'        # http://www.ruby-doc.org/stdlib-1.9.3/libdoc/matrix/rdoc/index.html
require 'mustache'      # https://github.com/defunkt/mustache

THIS_DIR = File.expand_path('..', __FILE__)
PROJECT_ROOT = File.expand_path('../../../..',  THIS_DIR) if !defined? PROJECT_ROOT

DATA_PATH = File.join(THIS_DIR, "data")
CLASSIC_PATH = File.join(DATA_PATH, "classic")
NEXTGEN_PATH = File.join(DATA_PATH, "nextgen")
INDEX_PATH = File.join(DATA_PATH, "index.txt")

# some conversion constants for later
JOULES_PER_EV = 1.6021770000000003e-19
KILOGRAMS_PER_DALTON = 1.66054e-27
MW_VELOCITY_UNITS_PER_METER_PER_SECOND = 1e-6

# x, y grid position of atom i (0 <= i < NX*NY)
SQRT_3_OVER_2 = Math.sqrt(3)/2

# Boltzmann constant
KB = 8.6173423e-5   # eV/K

# Define the elements
SIGMA = 0.07    # nm
MASS = 39.95    # g/mol (amu, Dalton)

RMIN = 2 ** (1.0/6) * SIGMA

# dimensions of container
HEIGHT = 5.0      # nm
WIDTH  = 5.0      # nm

# Organize particles into grid of NX x NY particles
NX = 7
NY = 7
N = 2 * NX * NY

# Lennard-Jones potential for squared pairwise separation = rsq
def lj(rsq, epsilon, sigma=SIGMA)
  alpha = 4 * epsilon * sigma ** 12
  beta  = 4 * epsilon * sigma ** 6
  return alpha * rsq ** -6 - beta * rsq ** -3
end

#  Location on the unit-length hexagonal lattice of the ith particle
def grid_pos(i)
  x = i % NX
  y = i / NX

  x += 0.5 if y % 2 == 0
  y *= SQRT_3_OVER_2

  return [x, y]
end

# potential energy of NX * NY particles arranged in a hexagonal lattice
# with interparticle distance r
def pe(r, epsilon)
  # calculate pe from LJ formula
  pe = 0
  n = NX * NY
  for i in 0...n-1
    for j in i+1...n
      xi, yi = grid_pos(i)
      xj, yj = grid_pos(j)
      rsq = r * r * ((xi-xj).abs ** 2 + (yi-yj).abs ** 2)
      pe += lj(rsq, epsilon)
    end
  end
  return pe
end

# returns [x,y] vectors for NX*NY particles arranged in a hexagonal lattice
# with separation r
def positions(r)
  x = []
  y = []

  leftx = -r*(NX - 1) / 2
  topy  = -SQRT_3_OVER_2 * r * (NY - 1) / 2

  for i in 0...NX*NY do
    a, b = grid_pos(i)
    x.push(leftx + r*a)
    y.push(topy + r*b)
  end

  return [x, y]
end

# VX, VY angles for n particles which should have total KE, in Joules,
# 'initial_ke_in_ev'. All particles will translate in direction 'angle'
def velocities(initial_ke_in_ev, n, angle)
  vx = []
  vy = []

  ke_per_atom_in_joules = initial_ke_in_ev * JOULES_PER_EV / n

  mass_in_kg = MASS * KILOGRAMS_PER_DALTON
  v_per_atom_in_mks = Math.sqrt(2 * ke_per_atom_in_joules / mass_in_kg)
  v = v_per_atom_in_mks * MW_VELOCITY_UNITS_PER_METER_PER_SECOND

  for i in 0...n do
    vx.push(v * Math.cos(angle))
    vy.push(v * Math.sin(angle))
  end

  return [vx, vy]
end

class Cml < Mustache
  self.template_path = File.dirname(__FILE__)
  attr_reader :model_number
  def initialize(model_num)
    @model_number = model_num
  end
end

class Mml < Mustache
  self.template_path = File.dirname(__FILE__)
  attr_reader :number_of_particles, :epsilon, :sigma, :mass, :width, :height, :atoms
  def initialize(number_of_particles, epsilon, sigma, mass, width, height, atoms)
    @number_of_particles = number_of_particles
    @epsilon = epsilon
    @sigma = sigma
    @mass = mass
    @width = width
    @height = height
    @atoms = atoms
  end
end

def generate_mw_files(num, epsilon, x, y, vx, vy)
  File.open(File.join(CLASSIC_PATH, "model#{num}.cml"), 'w') { |f| f.write Cml.new(num).render }
  atoms = [x, y, vx, vy].transpose.collect { |a|
    { "rx" => 100*a[0], "ry" => 100*a[1], "vx" => 100*a[2], "vy" => 100*a[3] }
  }
  File.open(File.join(CLASSIC_PATH, "model#{num}$0.mml"), 'w') do |f|
    f.write Mml.new(atoms.length, epsilon, 100*SIGMA, MASS/120, WIDTH*100, HEIGHT*100, atoms).render
  end
end

def convert_mml_file(num)
  converter = 'node' + File.join(PROJECT_ROOT, "node-bin/convert-mml.js")
  input_mml_file = File.join(CLASSIC_PATH, "model#{num}$0.mml")
  output_json_file = File.join(NEXTGEN_PATH, "model#{num}.json")
  cmd = "#{converter} '#{input_mml_file}' #{output_json_file}"
  puts "\ncommand:\n#{cmd}"
  system(cmd)
end

def generate_md2d_data_file(num)
  generator = 'node' +  File.join(PROJECT_ROOT, "node-bin/run-md2d.js")
  input_json_file = File.join(NEXTGEN_PATH, "model#{num}.json")
  output_txt_file = File.join(NEXTGEN_PATH, "model#{num}.data.txt")
  total_time = 41000
  cmd = "#{generator} -i '#{input_json_file}' -o #{output_txt_file} -t #{total_time}"
  puts "\ncommand:\n#{cmd}"
  system(cmd)
end

def linspace(start, stop, number)
  interval = (stop-start)/(number-1)
  results = [start]
  results.push(results.last + interval) while results.last <= stop
  results
end

FileUtils.mkdir_p CLASSIC_PATH
FileUtils.mkdir_p NEXTGEN_PATH

# erase any files in the nextgen path
FileUtils.rm_r Dir.glob(NEXTGEN_PATH + '/*')

INDEX_FORMAT_STR = "%d\t%.3f\t%.3f\t%.3f\t%.3f\n"

File.open(INDEX_PATH, "w") do |index_file|
  index_file.write(sprintf("%s\t%s\t%s\t%s\t%s\n", 'model', 'epsilon', 'initial PE', 'initial KE', 'approx. final KE'))
  model_num = 1
  ['solid', 'gas'].each do |state|
    linspace(0.01, 0.1, 5).each do |epsilon|
      initial_pe = 2*pe(RMIN, epsilon)
      if state == 'gas'
        final_ke = N * KB * 1000
        initial_ke = final_ke - initial_pe
      else
        initial_ke = 0
        final_ke = 0
      end

      index_file.write(sprintf(INDEX_FORMAT_STR, model_num, epsilon, initial_pe, initial_ke, final_ke))

      x, y = positions(RMIN)

      # some atoms headed down
      top_x = x.collect { |i| i + WIDTH / 2 }
      top_y = y.collect { |i| i + HEIGHT / 4 }
      top_vx, top_vy = velocities(initial_ke/2, N/2, Math::PI/2)

      # and some atoms headed up
      bottom_x = x.collect { |i| i + WIDTH / 2 }
      bottom_y = y.collect { |i| i + 3 * HEIGHT / 4 }
      bottom_vx, bottom_vy = velocities(initial_ke/2, N/2, -Math::PI/2)

      generate_mw_files(model_num, epsilon, top_x+bottom_x, top_y+bottom_y, top_vx+bottom_vx, top_vy+bottom_vy)
      convert_mml_file(model_num)
      model_num += 1
    end
  end
end

(1..10).each { |num| generate_md2d_data_file(num) }
