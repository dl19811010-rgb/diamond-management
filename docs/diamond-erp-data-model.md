# 钻石 ERP 数据模型草案

## 1. 设计原则

本系统的数据模型应围绕以下原则建立：

1. 以批次为业务源头
2. 以封包为流转载体
3. 以交接单为扫码留痕主体
4. 以状态机控制流程推进
5. 以异常单承载差异与处理闭环

当前原型中的 `Order`、`PackageTrace`、`ScanRecord` 仍偏演示模型，后续建议逐步替换为更稳定的业务对象。

## 2. 建议的核心实体

### 2.1 PurchaseBatch

采购批次，作为整个流程的起点。

建议字段：

- id
- batchNo
- supplierId
- stoneCategory
- sizeCategory
- estimatedWeight
- estimatedStoneCount
- purchaseDate
- originCountry
- currency
- amount
- remark
- status

建议状态：

- draft
- purchased
- in_transit_to_hk
- arrived_hk
- transferred_to_sz
- arrived_sz
- closed
- voided

### 2.2 TransitRecord

流转记录，用于管理跨地区运输。

建议字段：

- id
- transitNo
- batchId
- fromSite
- toSite
- handoverUserId
- receiverUserId
- transportMode
- carrierName
- departureTime
- arrivalTime
- currentStatus
- attachmentUrls
- remark

建议状态：

- pending_dispatch
- dispatched
- in_transit
- arrived
- signed
- exception

### 2.3 ReceiptRecord

收货记录，用于香港和深圳的正式收货确认。

建议字段：

- id
- receiptNo
- batchId
- siteCode
- sourceTransitId
- expectedWeight
- actualWeight
- expectedStoneCount
- actualStoneCount
- weightDiff
- stoneDiff
- receiverUserId
- reviewerUserId
- receiptTime
- status
- remark

建议状态：

- pending
- received
- reviewed
- exception

### 2.4 SortingJob

分选作业单。

建议字段：

- id
- sortingNo
- batchId
- sourceReceiptId
- pickupHandoverId
- operatorUserId
- reviewerUserId
- startTime
- endTime
- inputWeight
- inputStoneCount
- outputWeight
- outputStoneCount
- lossWeight
- lossStoneCount
- resultStatus
- remark

建议状态：

- pending
- picked
- processing
- completed
- reviewed
- exception

### 2.5 SortingResultItem

分选结果明细，用于记录分出的类别结构。

建议字段：

- id
- sortingJobId
- categoryCode
- qualityGrade
- weight
- stoneCount
- remark

### 2.6 ScreeningJob

细筛作业单。

建议字段：

- id
- screeningNo
- sourceSortingJobId
- pickupHandoverId
- operatorUserId
- reviewerUserId
- ruleCode
- startTime
- endTime
- inputWeight
- inputStoneCount
- outputWeight
- outputStoneCount
- qualityResult
- resultStatus
- remark

建议状态：

- pending
- picked
- processing
- completed
- reviewed
- exception

### 2.7 PackagingJob

封包作业单。

建议字段：

- id
- packageNo
- batchId
- sourceScreeningJobId
- packerUserId
- reviewerUserId
- packageWeight
- packageStoneCount
- sealCode
- packageTime
- packageStatus
- currentLocation
- remark

建议状态：

- pending
- packing
- sealed
- reviewed
- stored
- shipped
- signed
- exception

### 2.8 ShipmentOrder

客户出货单。

建议字段：

- id
- shipmentNo
- customerId
- packageId
- customerRequirement
- shipWeight
- shipStoneCount
- reviewerUserId
- logisticsNo
- dispatchTime
- signTime
- status
- remark

建议状态：

- pending_review
- ready_to_ship
- shipped
- signed
- exception
- closed

### 2.9 HandoverRecord

扫码交接单，是扫码确认的正式业务对象。

建议字段：

- id
- handoverNo
- businessType
- sourceEntityType
- sourceEntityId
- batchId
- packageId
- fromSite
- toSite
- fromUserId
- toUserId
- handoverWeight
- handoverStoneCount
- qrCodeValue
- corpWechatUserId
- corpWechatConfirmId
- confirmTime
- deviceId
- status
- remark

建议业务类型：

- hk_receipt
- hk_to_sz_transfer
- sz_receipt
- sorting_pickup
- sorting_return
- screening_pickup
- screening_return
- packaging_confirm
- shipment_review
- customer_sign

建议状态：

- pending
- scanned
- confirmed
- timeout
- rejected
- exception

### 2.10 ExceptionCase

异常处理单，用于承载重量差异、粒数差异、品质异常、扫码异常。

建议字段：

- id
- exceptionNo
- exceptionType
- sourceEntityType
- sourceEntityId
- batchId
- packageId
- foundAtNode
- foundByUserId
- severity
- description
- status
- handlerUserId
- resolutionType
- resolutionNote
- closedAt

建议异常类型：

- weight_diff
- stone_count_diff
- quality_mismatch
- package_damage
- scan_failed
- scan_timeout
- wrong_receiver
- data_inconsistency

建议状态：

- open
- assigned
- processing
- waiting_review
- closed
- cancelled

### 2.11 InventoryLedger

库存台账，用于统一管理在库、在途、冻结和已出货数量。

建议字段：

- id
- batchId
- packageId
- locationCode
- stockType
- quantityWeight
- quantityStoneCount
- availableWeight
- availableStoneCount
- frozenWeight
- frozenStoneCount
- status
- updatedAt

建议库存类型：

- in_transit
- in_hk
- in_sz
- sorting
- screening
- packaged
- ready_to_ship
- shipped

### 2.12 CorpWechatBinding

员工与企业微信身份绑定关系。

建议字段：

- id
- userId
- corpWechatUserId
- corpWechatName
- departmentName
- mobile
- boundAt
- isActive
- lastVerifyAt

## 3. 建议保留和重构的前端类型

当前 `src/types/index.ts` 中可保留的方向：

- User
- Inventory
- PackageTrace

但建议进行以下重构：

- `Order` 改造成 `PurchaseBatch` 或 `ShipmentOrder`，不要继续把所有业务都挂在一个订单上
- `ScanRecord` 升级为 `HandoverRecord`
- `QualityRecord` 拆分为 `SortingJob`、`ScreeningJob`、`ExceptionCase`

## 4. 建议的主状态机

建议用统一流程状态机驱动主流程，而不是只依赖页面按钮变更简单状态。

推荐主流程节点：

1. 印度采购完成
2. 发往香港
3. 香港收货
4. 香港转深圳
5. 深圳收货
6. 待分选
7. 分选中
8. 待细筛
9. 细筛中
10. 待封包
11. 已封包
12. 待出货
13. 已出货
14. 客户已签收
15. 异常冻结
16. 作废关闭

建议状态推进规则：

- 进入下一节点后，不允许直接退回上一步
- 如出现问题，应通过异常单处理，而不是回退原状态
- 如业务终止，应走作废关闭流程
- 关键交接节点必须完成扫码确认后才允许推进

## 5. 关键关联关系

建议的数据关联主线如下：

1. 一个 PurchaseBatch 可以对应多个 TransitRecord
2. 一个 PurchaseBatch 可以对应多个 ReceiptRecord
3. 一个 PurchaseBatch 可以生成多个 SortingJob
4. 一个 SortingJob 可以生成多个 SortingResultItem
5. 一个 SortingJob 可以衍生一个或多个 ScreeningJob
6. 一个 ScreeningJob 可以生成一个或多个 PackagingJob
7. 一个 PackagingJob 可以关联多个 HandoverRecord
8. 一个 ShipmentOrder 通常对应一个或多个 PackagingJob
9. 任意关键实体都可以关联多个 ExceptionCase

## 6. 扫码确认留痕规则

企业微信扫码确认建议采用以下落地规则：

1. 先识别当前业务场景
2. 再校验扫码人身份绑定是否有效
3. 再校验该扫码人是否是当前节点允许的交接人
4. 再记录本次交接重量和粒数
5. 再生成正式 HandoverRecord
6. 再回写源业务单状态
7. 同时写入审计日志

建议强制记录的信息：

- 谁交出
- 谁接收
- 在哪里交接
- 交接什么批次或封包
- 交接时重量和粒数
- 企业微信确认结果
- 交接时间

## 7. 当前原型的重构落点

当前前端原型后续建议按以下方向调整：

1. 在 `types` 中先补新的业务实体定义
2. 在 `store` 中把 mock 数据改成按批次、封包、交接单组织
3. 在页面层把“订单管理”拆散到采购、收货、出货等模块
4. 把扫码页升级为统一交接中心
5. 把异常处理页改成真正围绕 ExceptionCase 运转

## 8. 当前阶段建议先做的开发项

文档确认后，优先建议实施以下开发项：

1. 重构 `types/index.ts`
2. 重构 `useStore.ts`
3. 重做一级菜单
4. 重构扫码确认流程
5. 重构追踪和异常联动

在这些基础完成前，不建议直接接企业微信接口，因为前端业务对象尚未稳定。
