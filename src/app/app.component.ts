import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, interval } from 'rxjs';
import { filter } from 'lodash';
import { Chart } from 'angular-highcharts';
import { SHAREDETAILS } from '../assets/constant';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public dataSet: Array<any> = [];
  public timestamp = '';
  public underlyingValue = '';
  public ATMdata: any;
  public intradayTable: Array<any> = [];
  public displayedColumns: string[] = ['openInterestCall', 'changeinOpenInterestCall', 'strikePrice',  'changeinOpenInterestPut', 'openInterestPut'];
  public displayedColumnsFinal: string[] = ['timestamp', 'coiCall', 'coiPut', 'coiDiff', 'optionSignal', 'multiplier'];
  public chart: any;
  public pcr: number = 0;
  public shareDetails: any = SHAREDETAILS;
  public selectedStock: string = this.shareDetails[0].symbol;
  public selectedStockObj: any = this.shareDetails[0];
  public userInputCookie: string = '';

  constructor(private http: HttpClient, private _cdr: ChangeDetectorRef) {
  }

  ngOnInit() {
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
        },
        {
          name: 'COI DIFF',
          data: [],
          color: "#000000",
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
      this.dataSet = [];
      let coiCall = 0;
      let coiPut = 0;
      let oiCall = 0;
      let oiPut = 0;
      this.timestamp = res.records.timestamp;
      this.underlyingValue = res.records.underlyingValue;
      this.ATMdata = Math.round(Number(this.underlyingValue) / this.selectedStockObj.strikeDifference) * this.selectedStockObj.strikeDifference;
      res.filtered.data.map((result: any) => {
        if ((Number(this.underlyingValue) - this.selectedStockObj.noOfPutOI) <= Number(result.strikePrice) && Number(result.strikePrice) <= (Number(this.underlyingValue) + this.selectedStockObj.noOfCallOI)) {
          let item: any = {
            'openInterestCall': result['CE'].openInterest,
            'openInterestPut': result['PE'].openInterest,
            'strikePrice': result.strikePrice,
            'changeinOpenInterestPut': result['PE'].changeinOpenInterest,
            'changeinOpenInterestCall': result['CE'].changeinOpenInterest
          };
          if (Number(this.ATMdata) === Number(result.strikePrice)) {
            item['ATM'] = true;
          }
          this.dataSet.push(item);
          coiPut += result['PE'].changeinOpenInterest;
          coiCall += result['CE'].changeinOpenInterest;
          oiPut += result['PE'].openInterest;
          oiCall += result['CE'].openInterest;
        }
      });

      this.pcr = Number((Number(oiPut)/Number(oiCall)).toFixed(2));

      this.intradayTable = [{
        'timestamp': this.timestamp.split(' ')[1],
        'coiCall': coiCall,
        'coiPut': coiPut,
        'coiDiff': Number(coiCall - coiPut),
        'optionSignal': Number(coiCall - coiPut) < 0 ? 'Buy' : 'Sell',
        'multiplier':  Number(coiCall/coiPut).toFixed(2),
      }, ...this.intradayTable];

      this.chart.addPoint(coiCall, 0);
      this.chart.addPoint(coiPut, 1);
      this.chart.addPoint(Number(coiCall - coiPut), 2);

      this._cdr.markForCheck();
    });
  }

  fetchData() {
    const headers = new HttpHeaders({
      'Cookie': this.userInputCookie.length ? this.userInputCookie : 'bm_sv=9EFF58DB56F21EAC426251B546D7AD0F~plTfCM8Kl2JTRxQyL9n1cW/7X0xNAo6ilyPwOQY4PtGXM0/NGtgXX5J4PE5kXSTO9RIie7YGSf03ttJB3qpctRGsOZQjQc0dM6NwcJPjQqp7UCErLHdC5Synl79dJ92CBv5cnurnOY1XuwTIfcg7/3J6ohHG2u3eREYfVo6cBPU=; Domain=.nseindia.com; Path=/; Max-Age=2884; HttpOnly',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.5',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    return this.http.get(`/api/option-chain-indices?symbol=${this.selectedStockObj.symbol}`, { headers: headers });
  }

  onSelectionChange(event: any) {
    localStorage.setItem(this.selectedStock, JSON.stringify(this.intradayTable));
    this.selectedStock = event;
    this.selectedStockObj = this.shareDetails.find((detail: any) => {
        return detail.symbol === event;
    }) || this.shareDetails[0];
    this.chart.removeSeries(0);
    this.chart.removeSeries(1);
    this.chart.removeSeries(2);
    this.intradayTable = [];
    this.intradayTable = [...JSON.parse(localStorage.getItem(this.selectedStock) || "[]")];
    this.intradayTable.forEach((item: any) => {
      this.chart.addPoint(item.coiCall, 0);
      this.chart.addPoint(item.coiPut, 1);
      this.chart.addPoint(Number(item.coiCall - item.coiPut), 2);
    });
    this.createResultSet();
  }
}
