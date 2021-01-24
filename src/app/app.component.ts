import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, interval } from 'rxjs';
import { filter } from 'lodash';
import { Chart } from 'angular-highcharts';
import { ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public putData: Array<any> = [];
  public callData: Array<any> = [];
  public timestamp = '';
  public underlyingValue = '';
  public ATMdata: any;
  public intradayTable: Array<any> = [];
  public displayedColumns: string[] = ['strikePrice', 'openInterest', 'changeinOpenInterest'];
  public displayedColumnsFinal: string[] = ['timestamp', 'coiCall', 'coiPut', 'coiDiff', 'optionSignal'];
  public chart: any;

  constructor(private http: HttpClient, private _cdr: ChangeDetectorRef, private routes: ActivatedRoute) {
  }

  public constantData: any = {
    'strikeDifference' : 50,
    'noOfPutOI': 250,
    'noOfCallOI': 200,
    'symbol': 'NIFTY'
  };

  ngOnInit() {
    this.routes.queryParams.subscribe(params => {
      console.log(params);
     if(params.index === 'BankNifty') {
       this.constantData = {
         'strikeDifference' : 100,
         'noOfPutOI': 1000,
         'noOfCallOI': 900,
         'symbol': 'BANKNIFTY'
       }
     }
    });

    this.chart = new Chart({
      chart: {
        type: 'line'
      },
      title: {
        text: 'Linechart'
      },
      credits: {
        enabled: false
      },
      series: [
        {
          name: 'CALL COI',
          data: [],
          color: "#FF0000",
          type: 'line',
        },
        {
          name: 'PUT COI',
          data: [],
          color: "#00FF00",
          type: 'line',
        }
      ]
    });
    this.createResultSet();
    interval(600000).subscribe(() => {
      this.createResultSet();
    });
  }

  createResultSet() {
    this.fetchData().subscribe((res: any) => {
      this.putData = [];
      this.callData = [];
      let coiCall = 0;
      let coiPut = 0;
      this.timestamp = res.records.timestamp;
      this.underlyingValue = res.records.underlyingValue;
      this.ATMdata = Math.round(Number(this.underlyingValue) / this.constantData.strikeDifference) * this.constantData.strikeDifference;
      res.filtered.data.map((result: any) => {
        if ((Number(this.underlyingValue) - this.constantData.noOfPutOI) <= Number(result.strikePrice) && Number(result.strikePrice) <= (Number(this.underlyingValue) + this.constantData.noOfCallOI)) {
          if (Number(this.ATMdata) === Number(result.strikePrice)) {
            result['PE']['ATM'] = true;
            result['CE']['ATM'] = true;
          }
          this.putData.push(result['PE']);
          this.callData.push(result['CE']);
          coiPut += result['PE'].changeinOpenInterest;
          coiCall += result['CE'].changeinOpenInterest;
        }
      })

      this.intradayTable = [{
        'timestamp': this.timestamp.split(' ')[1],
        'coiCall': coiCall,
        'coiPut': coiPut,
        'coiDiff': Number(coiCall - coiPut),
        'optionSignal': Number(coiCall - coiPut) < 0 ? 'Buy' : 'Sell'
      }, ...this.intradayTable];

      this.chart.addPoint(coiCall, 0);
      this.chart.addPoint(coiPut, 1);

      this._cdr.markForCheck();
    });
  }

  fetchData() {
    const headers = new HttpHeaders({
      'Cookie': 'bm_sv=9EFF58DB56F21EAC426251B546D7AD0F~plTfCM8Kl2JTRxQyL9n1cW/7X0xNAo6ilyPwOQY4PtGXM0/NGtgXX5J4PE5kXSTO9RIie7YGSf03ttJB3qpctRGsOZQjQc0dM6NwcJPjQqp7UCErLHdC5Synl79dJ92CBv5cnurnOY1XuwTIfcg7/3J6ohHG2u3eREYfVo6cBPU=; Domain=.nseindia.com; Path=/; Max-Age=2884; HttpOnly',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.5',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    return this.http.get(`/api/option-chain-indices?symbol=${this.constantData.symbol}`, { headers: headers });
  }
}
