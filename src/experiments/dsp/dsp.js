
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

var selectSize = document.getElementById('select-size'),
    responsiveLayout = document.getElementById('responsive-layout');

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
    dataType: 'samples',
    dataSamples: sinDataSet,
    sampleInterval: 1/sampleRate,
    fontScaleRelativeToParent: false,
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    xTickCount: 5,
    markAllDataPoints: false,
    dataChange: false,
    addData: false
  },
  "triangleWave": {
    title:  "Triangle Wave",
    dataType: 'samples',
    dataSamples: triangleDataSet,
    sampleInterval: 1/sampleRate,
    fontScaleRelativeToParent: false,
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    xTickCount: 5,
    markAllDataPoints: false,
    dataChange: false,
    addData: false,
  },
  "sawtoothWave": {
    title:  "Sawtooth Wave",
    dataType: 'samples',
    dataSamples: sawtoothDataSet,
    sampleInterval: 1/sampleRate,
    fontScaleRelativeToParent: false,
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    xTickCount: 5,
    markAllDataPoints: false,
    dataChange: false,
    addData: false
  },
  "squareWave": {
    title:  "Square Wave",
    dataType: 'samples',
    dataSamples: squareDataSet,
    sampleInterval: 1/sampleRate,
    fontScaleRelativeToParent: false,
    xlabel: "Time",
    ylabel: "Amplitude",
    xmax:   0.0167,
    xmin:   0,
    ymax:   1.5,
    ymin:   -1.5,
    xTickCount: 5,
    markAllDataPoints: false,
    dataChange: false,
    addData: false
  },
  "fft": {
    title:  "FFT: Frequency Domain Spectra",
    dataType: 'samples',
    dataSamples: [],
    sampleInterval: sampleRate/bufferSize,
    fontScaleRelativeToParent: false,
    xlabel: "Frequency",
    ylabel: "Amplitude",
    yscale: "pow",
    yscaleExponent: 0.3,
    xmax:   1024,
    xmin:   0,
    ymax:   2,
    ymin:   0,
    yTickCount: 5,
    markAllDataPoints: false,
    dataChange: false,
    addData: false,
    lines: false,
    bars: true
  }
};

graph1 = Lab.grapher.Graph('#chart1', graphOptions.sinWave);
graph2 = Lab.grapher.Graph('#chart2', graphOptions.fft);

selectData = document.getElementById('select-data');
function selectDataHandler() {
  stopStreaming = true;
  graphOptions.fft.responsiveLayout = responsiveLayout.checked;
  switch(selectData.value) {
    case "sin-wave":
    graphOptions.sinWave.responsiveLayout = responsiveLayout.checked;
    graph1.reset('#chart1', graphOptions.sinWave);
    graphOptions.fft.dataSamples = sinSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

    case "triangle-wave":
    graphOptions.triangleWave.responsiveLayout = responsiveLayout.checked;
    graph1.reset('#chart1', graphOptions.triangleWave);
    graphOptions.fft.dataSamples = triangleSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

    case "sawtooth-wave":
    graphOptions.sawtoothWave.responsiveLayout = responsiveLayout.checked;
    graph1.reset('#chart1', graphOptions.sawtoothWave);
    graphOptions.fft.dataSamples = sawtoothSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

    case "square-wave":
    graphOptions.squareWave.responsiveLayout = responsiveLayout.checked;
    graph1.reset('#chart1', graphOptions.squareWave);
    graphOptions.fft.dataSamples = squareSpectrum;
    graph2.reset('#chart2', graphOptions.fft);
    break;

  }
}
selectData.onchange = selectDataHandler;
responsiveLayout.onchange = selectDataHandler;
selectDataHandler();