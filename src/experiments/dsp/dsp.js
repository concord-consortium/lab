
stopStreaming = false;

var i,
    bufferSize = 2048,
    sampleRate = 8192,
    frequency = 120,
    fft1 = new RFFT(bufferSize, sampleRate),
    fft2 = new RFFT(bufferSize, sampleRate),
    fft3 = new RFFT(bufferSize, sampleRate),
    fft4 = new RFFT(bufferSize, sampleRate),

    sine = new Oscillator(DSP.SINE, frequency, 1, bufferSize, sampleRate),
    sinDataSet = sine.generate(),
    sinSpectrum,

    triangle = new Oscillator(DSP.TRIANGLE, frequency, 1, bufferSize, sampleRate),
    triangleDataSet = triangle.generate(),
    triangleSpectrum,

    saw = new Oscillator(DSP.SAW, frequency, 1, bufferSize, sampleRate),
    sawtoothDataSet = saw.generate(),
    sawtoothSpectrum,

    square = new Oscillator(DSP.SQUARE, frequency, 1, bufferSize, sampleRate),
    squareDataSet = square.generate(),
    squareSpectrum;

sinSpectrum =      fft1.forward(sinDataSet);
triangleSpectrum = fft2.forward(triangleDataSet);
sawtoothSpectrum = fft3.forward(sawtoothDataSet);
squareSpectrum =   fft4.forward(squareDataSet);

var surfaceTemperatures = [];

var selectSize = document.getElementById('select-size');

function selectSizeHandler() {
  switch(selectSize.value) {
    case "large":
    graph1.resize(960, 640);
    graph2.resize(960, 640);
    break;

    case "medium":
    graph1.resize(640, 480);
    graph2.resize(640, 480);
    break;

    case "small":
    graph1.resize(320, 240);
    graph2.resize(320, 240);
    break;

    case "tiny":
    graph1.resize(240, 160);
    graph2.resize(240, 160);
    break;

    case "icon":
    graph1.resize(120, 80);
    graph2.resize(120, 80);
    break;
  }
}
selectSize.onchange = selectSizeHandler;

graphOptions = {
  "sinWave": {
    title:  "Sin Wave",
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    circleRadius: false,
    dataChange: false,
    addData: false,
    dataset: sinDataSet,
    sample: 1/sampleRate
  },
  "triangleWave": {
    title:  "Triangle Wave",
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    circleRadius: false,
    dataChange: false,
    addData: false,
    dataset: triangleDataSet,
    sample: 1/sampleRate
  },
  "sawtoothWave": {
    title:  "Sawtooth Wave",
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    circleRadius: false,
    dataChange: false,
    addData: false,
    dataset: sawtoothDataSet,
    sample: 1/sampleRate
  },
  "squareWave": {
    title:  "Square Wave",
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    circleRadius: false,
    dataChange: false,
    addData: false,
    dataset: squareDataSet,
    sample: 1/sampleRate
  },
  "fft": {
    title:  "FFT: Frequency Domain Spectra",
    xlabel: "Frequency",
    ylabel: "Amplitude",
    yscale: "pow",
    yscaleExponent: 0.3,
    xmax:   1024,
    xmin:   0,
    ymax:   2,
    ymin:   0,
    circleRadius: false,
    dataChange: false,
    addData: false,
    dataset: [],
    sample: sampleRate/bufferSize,
    lines: false,
    bars: true
  }
};

graph1 = Lab.grapher.realTimeGraph('#chart1', graphOptions.sinWave);
graph2 = Lab.grapher.realTimeGraph('#chart2', graphOptions.fft);

selectData = document.getElementById('select-data');
function selectDataHandler() {
  stopStreaming = true;
  switch(selectData.value) {
    case "sin-wave":
    graph1.reset('#chart1', graphOptions.sinWave);
    graphOptions.fft.dataset = sinSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

    case "triangle-wave":
    graph1.reset('#chart1', graphOptions.triangleWave);
    graphOptions.fft.dataset = triangleSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

    case "sawtooth-wave":
    graph1.reset('#chart1', graphOptions.sawtoothWave);
    graphOptions.fft.dataset = sawtoothSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

    case "square-wave":
    graph1.reset('#chart1', graphOptions.squareWave);
    graphOptions.fft.dataset = squareSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

  }
}
selectData.onchange = selectDataHandler;
selectDataHandler();