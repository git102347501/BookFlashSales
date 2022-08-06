import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, ConfigStateService, CurrentUserDto, DynamicLayoutComponent, NAVIGATE_TO_MANAGE_PROFILE, SessionStateService } from '@abp/ng.core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FlashSalePlanService } from '@proxy/easy-abp/eshop/plugins/flash-sales/flash-sale-plans';
import { CreateOrderInput, FlashSalePlanGetListInput } from '@proxy/easy-abp/eshop/plugins/flash-sales/flash-sale-plans/dtos';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fakeAsync } from '@angular/core/testing';
import { FlashSaleResultService } from '@proxy/easy-abp/eshop/plugins/flash-sales/flash-sale-results';

@Component({
  selector: 'app-pay'
  ,
  templateUrl: './pay.component.html',
  styleUrls: ['./pay.component.scss']
})
export class PayComponent implements OnInit {
  validateForm: FormGroup;
  loading = false;
  videMode = 2;
  currentUser$: Observable<CurrentUserDto> = this.configState.getOne$('currentUser');
  hour: string | number = '00';
  minite: string  | number = '00';
  sec: string  | number = '00';
  day: string | number  = '0';
  timer: any;
  beginTime: any;
  orderTime: any;
  planId: string;
  orderId: string;
  state = false;
  constructor(
    @Inject(NAVIGATE_TO_MANAGE_PROFILE) public navigateToManageProfile,
    private configState: ConfigStateService, private _snackBar: MatSnackBar,
    private fb: FormBuilder,private _router: Router, private flashSaleResultService: FlashSaleResultService,
    private authservice: AuthService, private flashSalePlanService : FlashSalePlanService) { }

  ngOnInit() {
    this.validateForm = this.fb.group({
      phone: [null, [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
      email: [null],
      userName: [null],
      name: [null],
      address: [null, [Validators.required]]
    });
    this.initClock();
  }
  submitForm(): void {
    if (this.videMode == 1) {
      this.selectMode();
      return;
    } else {
      if (this.state){
        this.submitOrder();
      } else {
        this._snackBar.open('活动尚未开始!');
      }
    }
  }
  jumpRouter(url: string){
    this._router.navigateByUrl(url);
  }
  logout(){
    this.authservice.logout();
    this.jumpRouter('/login');
  }
  selectMode(){
    if(this.videMode == 2){
      this.videMode = 1;
    } else {
      this.videMode = 2;
    }
  }
  refTime() : boolean {
    var nowTime = +new Date();
    var inputTime = +new Date(this.beginTime);
    // 得到秒数
    var remain = (inputTime - nowTime) / 1000;
    if (remain < 0) {
      this.day = 0;
      this.hour = '00';
      this.minite = '00';
      this.sec= '00';
      return false;
    }
    this.day = parseInt((remain / 60 / 60 / 24).toString());
    var h = parseInt((remain / 60 / 60 % 24).toString());
    this.hour = h < 10 ? '0' + h : h;
    var m = parseInt((remain / 60 % 60).toString());
    this.minite = m < 10 ? '0' + m : m;
    var s = parseInt((remain % 60).toString());
    this.sec = s < 10 ? '0' + s : s;
    return h > 0 || m > 0 || s > 0;
  }
  perOrder(){
    this.flashSalePlanService.preOrder(this.planId).subscribe(res=>{
      this.orderId = res.id;
      setTimeout(() => {
        this.perOrder();
      }, (res.expiresInSeconds - 15) * 1000);
    }, err => {
      this._snackBar.open('获取活动商品信息失败');
    })
  }
  initClock(){
    this.flashSalePlanService.get('3a0542d7-eed4-bb5f-77fd-96f32baecce9').subscribe(res=>{
      this.beginTime = res.beginTime;
      this.planId = res.id;
      this.perOrder();
      this.timer = setInterval(() => {
        if (!this.refTime()){
          this.state = true;
          clearInterval(this.timer);
        }
      }, 1000);
    }, err =>{
      this._snackBar.open('获取活动信息失败');
    });
  }
  submitOrder(){
    let parm : CreateOrderInput = {
      id: this.planId,
      extraProperties: null,
      customerRemark: ''
    }
    this.loading = true;
    this.flashSalePlanService.order(this.planId, parm).subscribe(res=>{
      this.orderId = res.id;
      if (this.orderId){
        setTimeout(() => {
          this.getOrderStatus();
        }, 2000);
      }
    }, err => {
      this.loading = false;
      this._snackBar.open('下单失败，请重试');
    })
  }
  getOrderStatus(){
    if(!this.orderId){
      this.loading = false;
      return;
    }
    this.flashSaleResultService.get(this.orderId).subscribe(res=>{
      if (res.status == 1){
        this._snackBar.open('恭喜您,抢购成功!');
        this.loading = false;
      } else {
        setTimeout(() => {
          this.getOrderStatus();
        }, 2000);
      }
    }, err => {
      this.loading = false;
      this._snackBar.open('获取下单结果发生错误');
    })
  }
}
