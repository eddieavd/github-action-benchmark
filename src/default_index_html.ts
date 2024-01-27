export const DEFAULT_INDEX_HTML = String.raw`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes" />
    <style>
      html {
        font-family: BlinkMacSystemFont,-apple-system,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",Helvetica,Arial,sans-serif;
        -webkit-font-smoothing: antialiased;
        background-color: #fff;
        font-size: 16px;
      }
      body {
        color: #4a4a4a;
        margin: 8px;
        font-size: 1em;
        font-weight: 400;
      }
      header {
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
      }
      main {
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      a {
        color: #3273dc;
        cursor: pointer;
        text-decoration: none;
      }
      a:hover {
        color: #000;
      }
      button {
        color: #fff;
        background-color: #3298dc;
        border-color: transparent;
        cursor: pointer;
        text-align: center;
      }
      button:hover {
        background-color: #2793da;
        flex: none;
      }
      .spacer {
        flex: auto;
      }
      .small {
        font-size: 0.75rem;
      }
      footer {
        margin-top: 16px;
        display: flex;
        align-items: center;
      }
      .header-label {
        margin-right: 4px;
      }
      .benchmark-set {
        margin: 8px 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      .benchmark-title {
        font-size: 3rem;
        font-weight: 600;
        word-break: break-word;
        text-align: center;
      }
      .benchmark-graphs {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        flex-wrap: wrap;
        width: 100%;
      }
      .benchmark-chart {
        max-width: 1000px;
      }
    </style>
    <title>Benchmarks</title>
  </head>

  <body>
    <header id="header">
      <div class="header-item">
        <strong class="header-label">Last Update:</strong>
        <span id="last-update"></span>
      </div>
      <div class="header-item">
        <strong class="header-label">Repository:</strong>
        <a id="repository-link" rel="noopener"></a>
      </div>
    </header>
    <main id="main"></main>
    <footer>
      <button id="dl-button">Download data as JSON</button>
      <div class="spacer"></div>
      <div class="small">Powered by <a rel="noopener" href="https://github.com/marketplace/actions/continuous-benchmark">github-action-benchmark</a></div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@2.9.2/dist/Chart.min.js"></script>
    <script src="data.js"></script>
    <script id="main-script">
      'use strict';
      (function() {
        // Colors from https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
        const toolColors = {
          cargo: '#dea584',
          go: '#00add8',
          benchmarkjs: '#f1e05a',
          benchmarkluau: '#000080',
          pytest: '#3572a5',
          googlecpp: '#f34b7d',
          catch2: '#f34b7d',
          julia: '#a270ba',
          jmh: '#b07219',
          benchmarkdotnet: '#178600',
          customBiggerIsBetter: '#38ff38',
          customSmallerIsBetter: '#ff3838',
          _: '#333333'
        };
        const colors    = [ "#3496e4", "#fd5b7b", "#45b7b7", "#ff9642", "#8d5afb", "#fec855", "#c2c4c8" ];
        const colors_bg = [ "#3496e460", "#fd5b7b60", "#45b7b760", "#ff964260", "#8d5afb60", "#fec85560", "#c2c4c860" ];

        function init() {
          function collectBenches( entries )
          {
            const map = new Map();
            for( const entry of entries )
            {
              const { commit, date, tool, benches } = entry;
              for( const bench of benches )
              {
                const result = { commit, date, tool, bench };

                const bm_name = result.bench.name.split( '<' )[ 0 ];
                const arr = map.get( bm_name );

                if( arr === undefined )
                {
                  map.set( bm_name, [result] );
                }
                else
                {
                  arr.push( result );
                }
              }
            }
            return map;
          }

          const data = window.BENCHMARK_DATA;

          // Render header
          document.getElementById('last-update').textContent = new Date(data.lastUpdate).toString();
          const repoLink = document.getElementById('repository-link');
          repoLink.href = data.repoUrl;
          repoLink.textContent = data.repoUrl;

          // Render footer
          document.getElementById('dl-button').onclick = () => {
            const dataUrl = 'data:,' + JSON.stringify(data, null, 2);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'benchmark_data.json';
            a.click();
          };

          // Prepare data points for charts
          return Object.keys(data.entries).map(name => ({
            name,
            dataSet: collectBenches(data.entries[name]),
          }));
        }

        function renderCombined( dataSets )
        {
          function getChartData( benchmarks )
          {
            const labels = new Set();

            const instantiations = new Map();
            for( const entry of benchmarks )
            {
              const name = entry.bench.name.split( '/' )[ 0 ];
              const arr = instantiations.get( name );

              if( arr === undefined )
              {
                instantiations.set( name, [entry] );
              }
              else
              {
                arr.push( entry );
              }
            }
            let col_idx = 0;
            const chartsets = [];
            for( const entry of instantiations )
            {
              const values = [];
              for( const bm of entry[1] )
              {
                values.push( bm.bench.value );
                labels.add( bm.bench.name.split( '/' )[ 1 ] );
              }
              const cset = {
                label: entry[1][0].bench.name.split( '/' )[ 0 ],
                data: values,
                borderWidth: 1,
                borderColor: colors[ col_idx ],
                backgroundColor: colors_bg[ col_idx ]
              };
              chartsets.push( cset );
              col_idx = ( col_idx + 1 ) % colors.length;
            }
            const chartdata = {
              labels: Array.from( labels ),
              datasets: chartsets
            };
            return chartdata;
          }
          function renderGraph( parent, benchmark )
          {
            for( const bm of benchmark.entries() )
            {
              const canvas = document.createElement('canvas');
              canvas.className = 'benchmark-chart';
              parent.appendChild(canvas);
              const color = toolColors[bm[ 1 ].length > 0 ? bm[ 1 ][0].tool : '_'];

              const data = getChartData( bm[ 1 ] );
              const options = {
                scales: {
                  xAxes: [
                    {
                      scaleLabel: {
                        display: true,
                        labelString: 'benchmark',
                      },
                    }
                  ],
                  yAxes: [
                    {
                      scaleLabel: {
                        display: true,
                        labelString: bm[ 1 ].length > 0 ? bm[ 1 ][0].bench.unit : '',
                      },
                      ticks: {
                        beginAtZero: true,
                      }
                    }
                  ],
                },
                tooltips: {
                  callbacks: {
                    afterTitle: items => {
                      const {index} = items[0];
                      const data = bm[ 1 ][index];
                      return '\n' + data.commit.message + '\n\n' + data.commit.timestamp + ' committed by @' + data.commit.committer.username + '\n';
                    },
                    label: item => {
                      let label = item.value;
                      const { range, unit } = bm[ 1 ][item.index].bench;
                      label += ' ' + unit;
                      if (range) {
                        label += ' (' + range + ')';
                      }
                      return label;
                    },
                    afterLabel: item => {
                      const { extra } = bm[ 1 ][item.index].bench;
                      return extra ? '\n' + extra : '';
                    }
                  }
                },
                onClick: (_mouseEvent, activeElems) => {
                  if (activeElems.length === 0) {
                    return;
                  }
                  // XXX: Undocumented. How can we know the index?
                  const index = activeElems[0]._index;
                  const url = bm[ 1 ][index].commit.url;
                  window.open(url, '_blank');
                },
              };

              new Chart(canvas, {
                type: 'line',
                data,
                options,
              });
            }
          }
          function renderBenchSet(name, benchSet, main) {
            const setElem = document.createElement('div');
            setElem.className = 'benchmark-set';
            main.appendChild(setElem);

            const nameElem = document.createElement('h1');
            nameElem.className = 'benchmark-title';
            nameElem.textContent = name;
            setElem.appendChild(nameElem);

            const graphsElem = document.createElement('div');
            graphsElem.className = 'benchmark-graphs';
            setElem.appendChild(graphsElem);

            renderGraph( graphsElem, benchSet );
          }

          const main = document.getElementById('main');
          for (const {name, dataSet} of dataSets) {
            renderBenchSet(name, dataSet, main);
          }
        }
        renderCombined(init()); // Start
      })();
    </script>
  </body>
</html>
`;
