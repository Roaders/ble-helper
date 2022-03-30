import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import projectPackage from '../../package.json';

import { AppComponent } from './app.component';

@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {
    constructor() {
        window.document.title = `ble-hrm Test Harness ${projectPackage.version}`;
    }
}
