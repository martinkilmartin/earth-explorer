/// <reference path="./phaser.d.ts" />

declare global {
  const Phaser: any;
  
  interface Window {
    __EARTH_EXPLORER_GAME__?: any;
    __EARTH_EXPLORER_READY__?: boolean;
    __SVG_WORLD_MAP__?: any;
    __SVG_WORLD_MAP_READY__?: boolean;
  }
}

export {};
