import moment from 'moment';
import * as _ from 'lodash';
// import {Observable} from 'vendor/npm/rxjs/Rx';
// import 'vendor/npm/rxjs/add/observable/interval';
import {Observable, Subject} from 'rxjs/Rx';
// import {Subject} from 'vendor/npm/rxjs/Rx';

export class StreamHandler {

  constructor(options, datasource, metrics) {
    this.options = options;
    this.ds = datasource;
    this.subject = new Subject();
    this.delta = false;
    this.metrics = {};
  }

  start() {
    console.log('StreamHandler.start', this);
    if (this.source) {
      return;
    }

    var target = this.options.targets[0];
    if (!target.interval) {
      target.interval = 1000
      // return;
    }
    this.delta = target.delta || false;

    console.log('StreamHandler: start()');

    var interval = moment.duration(parseInt(target.interval, 10)).milliseconds();
    // if (interval < 1000) {
    //   interval = 1000;
    // }

    this.startTime = new Date().getTime();
    this.endTime = new Date().getTime();

    // this.options.targets.forEach(target => {
    //   this.metrics[target.target] = { target: target.target, datapoints: [], delta: this.delta };
    // })


    var self = this;
    this.source = Observable.interval(interval)
      .subscribe(
        (data) => {
          let time = new Date().getTime();
          let fakeData = this.options.targets.map(target => {
            let datum = {};
            if (target.target === 'upper_25') {
              return {
                target: target.target,
                value: Math.sin(data),
                time: time
              }
            }
            return {
              target: target.target,
              value: Math.random() * 100,
              time: time
            }
          });

          this.onNext(fakeData);
        },
        (error) => {
          this.onError(error);
        },
        () => {
          this.onCompleted();
        }
      );

    // this.metrics = {};
  }

  onNext(data) {
    this.processMetricEvent(data);
  }

  onError(error) {
    console.log('stream error', error);
  }

  onCompleted() {
    console.log('stream completed');
  }

  stop() {
    console.log('Forcing event stream stop');
    if (this.source) {
      this.source.unsubscribe();
    }
    this.source = null;
  }

  subscribe(options) {
    return this.subject.subscribe(options);
  }

  processMetricEvent(data) {
    // var endTime = new Date().getTime();
    // var startTime = endTime - (60 * 1 * 1000);
    var seriesList = [];

    // if (this.delta) {
    //   if (data.length === 0) {
    //     return;
    //   }
    //   this.metrics = {};
    // }


    _.forEach(data, (d) => {
      var series = this.metrics[d.target];
      if (!series) {
        this.startTime = new Date().getTime();
        series = { target: d.target, datapoints: [], delta: this.delta };
        this.metrics[d.target] = series;
      }

      this.endTime = d.time;
      this.startTime = this.endTime - (60 * 1 * 200);
      if (series.datapoints.length > 200) {
        series.datapoints.shift();
      }
      series.datapoints.push([d.value, d.time]);
      seriesList.push(series);
    });

    let datum = {
      data: seriesList,
      range: { from: moment(this.startTime), to: moment(this.endTime) }
    };
    console.log(datum);
    this.subject.next(datum);
  }
}
