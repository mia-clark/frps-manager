

#### 默认启动
```shell
docker-compose -p docker_frpsmgrd up --force-recreate --detach
```

#### 指定启动文件
```shell
docker-compose -f ./docker-compose.yml -p docker_frpsmgrd up --force-recreate --detach
```

#### 指定启动文件-强制更新
```shell
docker-compose -f ./docker-compose.yml -p docker_frpsmgrd up --force-recreate --detach --pull always
```
