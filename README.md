网站 CDN 去中心化尝试

# 最新方案

查看：https://github.com/EtherDream/freecdn

----

# 演示

[https://fanhtml5.github.io/](https://fanhtml5.github.io/)


# 原理

将网站资源上传到外部站点，例如图床、相册、免费空间等（本案例使用 [IPFS](https://ipfs.io)），并记录下原路径与新 URL。

网站前端通过 [Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API) 拦截所有资源加载，将原始路径代理到相应的外部 URL 上，这样就能大幅降低网站带宽消耗，并且能根据用户端上的实际网络情况，动态选择最优节点。


# 部署

网站只需部署 2 个文件，一个 html 用于 404 展示，另一个 js 用于 SW 脚本。

当用户首次访问时，请求站点任意路径（上述 JS 除外）就能触发 404 页面，通过该页面即可实现 SW 的安装。然后页面自动刷新，之后所有的流量都走 SW 了。


# 安全性

为了防止外部站点篡改资源内容，我们还得记录资源 Hash 值。但这面临一个问题：我们必须等整个资源下载完成，才能对数据进行校验，这将导致资源无法渐进展示。例如，大图片在加载过程中始终处于白屏，最后才一次性展示，而无法边加载边展示。

为此，这里使用分块 Hash。我们将资源数据分成若干块（B1, B2, ..., Bn），然后使用链式 Hash：

```
H1 = hash(B1 + H2)
H2 = hash(B2 + H3)
H3 = hash(B3 + H4)
...
Hn-1 = hash(Bn-1 + Hn)
Hn = hash(Bn)
```

然后将 `B1, H2, B2, H3, B3, ..., Hn, Bn` 合并成新文件。在资源目录里，只需记录 H1 即可。

这样就能做到边校验边展示的效果了。具体实现可参考 `tool/pack.js`。


# 文件头

为了让文件更有通用性，我们将其打包成图片格式，使得可以在更多的站点上传。

出于演示，目前只在头部放置了一个 1x1 的 GIF 文件（这里称之 stub）。更好的方式，则是将数据放置于像素，以防网站修改文件信息。


# 更新中...

HTTP 206、错误重试、负载均衡、多线程加速、自动上传工具

参考：https://yq.aliyun.com/articles/236582
