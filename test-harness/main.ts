import 'reflect-metadata';
import 'zone.js';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { getRegisteredTypesWithFactories } from '@morgan-stanley/needle';

if (environment.production) {
    enableProdMode();
}

platformBrowserDynamic(getRegisteredTypesWithFactories())
    .bootstrapModule(AppModule)
    .catch((err) => console.error(err));
