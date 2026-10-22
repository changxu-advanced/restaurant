# 面接説明ガイド

## 30秒説明

日本の飲食店長がシフト、欠員、在庫、引き継ぎ、締めで抱える入力負担を減らすシステムです。Reactの操作画面、Spring Bootの多テナントAPI、PostgreSQL、OR-Tools排班、AWS CDKまで一貫して設計しました。AIに最終判断を任せず、無解理由と確認手順を明示する点を重視しています。

## 技術的に説明する点

- なぜSpring Bootをモジュラーモノリスにしたか
- なぜ最適化だけPythonへ分離したか
- JWT、tenant context、repository query、RLSによる多層分離
- SQSを使った長時間排班処理
- 欠損データを0扱いしない日結設計
- DemoとProductionのAWSコスト・可用性の違い

## 実店舗検証前の課題

- 社労士による労務Rule Setの確認
- POSと仕入先ごとのAdapter実装
- 実店舗2半月周期の操作時間測定
- バックアップ復元訓練と負荷試験

