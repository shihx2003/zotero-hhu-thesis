# zotero-hhu-thesis
# 河海大学学位论文 Zotero 抓取器

用于河海大学学位论文管理系统（超星平台）的 Zotero Web Translator。通过 Zotero Connector，将论文详情页的元数据和 PDF 全文保存到 Zotero。

## 功能

- 自动识别河海大学超星学位论文详情页，创建 `thesis` 类型条目。
- 提取中文题名、作者、导师、学位、答辩时间、论文页数和索书号。
- 读取完整中外文摘要，不受页面“展开”显示状态影响。
- 将中文关键词拆分为标签，并去除重复项。
- 将学院、专业、外文题名、研究方向、中图分类号等信息保存在 Extra 中。
- 从当前页面解析 PDF 下载签名，自动添加全文附件。
- 保存论文详情页链接，方便返回原始页面。

## 适用页面

支持以下形式的河海大学论文详情页：

```text
https://thesis.chaoxing.com/front/thesis/detail.html?id=THESIS_ID&websiteId=143555&wfwfid=24578&type=0&enc=YOUR_ENC_HERE
```

论文 ID、`enc` 和参数顺序可以变化。学校首页和搜索结果页暂不支持抓取。

页面需要校园网访问权限或相应认证。请先在安装了 Zotero Connector 的浏览器中完成认证，再打开论文详情页。

## 安装

1. 下载仓库中的 **[Hohai University Chaoxing Thesis.js](<Hohai University Chaoxing Thesis.js>)**。从 GitHub 下载时，使用文件页面的 Raw 下载功能，避免保存成 HTML 网页。
2. 在 Zotero 的“设置 → 高级 → 文件和文件夹”中查看或打开数据存储目录。
3. 将 `.js` 文件复制到数据存储目录下的 `translators` 文件夹。
4. 重启 Zotero。在 Zotero Connector 的高级设置中，如有“更新抓取器 / Update Translators”选项，执行一次。
5. 刷新已打开的论文详情页。

例如，若 Zotero 数据存储目录为 `~\Zotero`，文件应放在：

```text
~\Zotero\translators\Hohai University Chaoxing Thesis.js
```

文件开头的 JSON 是 Zotero 抓取器元数据头，必须保留。文件应使用 UTF-8 编码，不需要通过 Node.js 运行。

## 使用

1. 保持 Zotero 桌面程序运行。
2. 在浏览器中打开论文详情页，完成认证并等待正文加载完成。
3. 点击 Zotero Connector 图标，保存论文条目及 PDF 附件。

自动保存 PDF 需要在 Zotero“设置 → 常规 → 文件处理”中勾选“保存条目时自动附加相关 PDF 和其他文件”（不同版本的选项名称可能略有差异）。

## 字段映射

| 页面信息 | Zotero 字段 |
|---|---|
| 中文题名 | 标题 `title` |
| 姓名 | 作者 `author`，保留中文姓名 |
| 导师姓名 | 贡献者 `contributor`；同时保存在 Extra 中 |
| 学校 | 大学 `university`，河海大学 |
| 学位 | 论文类型 `thesisType` |
| 答辩时间 | 日期 `date` |
| 论文语种 | 语言 `language` |
| 中文摘要、外文摘要 | 摘要 `abstractNote` |
| 中文关键词 | 标签 `tags` |
| 论文页数 | 页数 `numPages` |
| 索书号 | 索书号 `callNumber` |
| 当前详情页地址 | URL `url` |
| 外文题名、外文关键词、学号/工号、学院、专业、入学年份 | Extra |
| 学科门类、一级学科、二级学科、学位类型、研究方向 | Extra |
| 导师单位、参考文献数量、中图分类号、库房名称、全文附件名 | Extra |

入学年份不会替代答辩日期，以免将入学时间误记为论文年份。缺少答辩时间时，日期留空。学院存入 Extra，因为 Zotero 的 `thesis` 类型没有独立的学院字段。

## PDF 下载

PDF 下载默认开启。抓取器从当前页面的下载函数读取论文 ID、学校编号和临时签名，构造下载地址，再通过 `item.attachments` 交给 Zotero 保存：

```text
https://thesis.chaoxing.com/back/thesis/downLoadFile?thesisId=THESIS_ID&fid=24578&sign=YOUR_SIGN_HERE&type=1
```

下载签名与详情页的 `enc` 不同，不需要手动填写。代码不包含固定签名、Cookie 或账号凭据，也不执行页面脚本。下载仍受网站权限和签名有效期限制。

如果只需要元数据，可将抓取器中的配置改为：

```javascript
var ENABLE_PDF = false;
```

修改后，重启 Zotero并更新 Connector 抓取器，再刷新页面。未能解析下载地址时，抓取器仍会保存元数据。

## 常见问题

### 搜索结果页没有论文图标

当前仅支持单篇论文详情页。请打开具体论文后再使用 Connector。

### 详情页没有识别到抓取器

确认地址为 `thesis.chaoxing.com/front/thesis/detail.html`，参数包含数字论文 `id` 和 `websiteId=143555`。再检查文件是否放入当前 Zotero 数据存储目录的 `translators` 文件夹，以及文件扩展名是否为 `.js`，而非 `.js.txt`。

### 提示尚未读取到中文题名

完成认证并等待正文加载。若页面已过期，重新从学校系统打开论文详情页，然后再抓取。

### 元数据保存成功，但 PDF 没有保存

确认 Zotero 已开启自动附加 PDF，且浏览器中能正常使用页面的“下载”按钮。刷新详情页取得当前签名后重新抓取。如果普通浏览器下载也失败，需要先解决网站访问权限问题。

### 更新文件后仍使用旧版本

覆盖原文件并重启 Zotero，更新 Connector 抓取器，然后刷新详情页。若仍有问题，可重新打开浏览器。

## 反馈问题

提交 Issue 时，请说明浏览器与 Zotero 版本、出现问题的步骤，以及问题属于页面识别、元数据提取还是 PDF 下载。可以附上脱敏后的 Connector 调试日志。

公开日志前，请移除 Cookie、Token、`enc`、`sign`、会话标识，以及不需要公开的个人信息。

## 参考

- [Zotero Translator 开发文档](https://www.zotero.org/support/dev/translators)
- [Zotero Translator 编写说明](https://www.zotero.org/support/dev/translators/coding)
- [Zotero 附件说明](https://www.zotero.org/support/attaching_files)
