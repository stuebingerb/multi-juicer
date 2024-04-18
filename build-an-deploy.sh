#!/usr/bin/env bash

echo "This Script can be used to 'easily' build all MultiJuicer components and install them to a local kubernetes cluster"
echo "For this to work the local kubernetes cluster must have access to the same local registry / image cache which 'docker build ...' writes its image to"
echo "For example docker-desktop with its included k8s cluster"

echo "Usage: ./build-and-deploy.sh"

version="$(uuidgen)"

docker build --progress plain -t local/juice-balancer:$version ./juice-balancer &
docker build --progress plain -t local/cleaner:$version ./cleaner &
docker build --progress plain -t local/progress-watchdog:$version ./progress-watchdog &

wait

if [ "$(kubectl config current-context)" = "kind-kind" ]; then
  kind load docker-image "local/progress-watchdog:$version" &
  kind load docker-image "local/cleaner:$version" &
  kind load docker-image "local/juice-balancer:$version" &

  wait
fi

helm upgrade --install multi-juicer ./helm/multi-juicer \
  --set="imagePullPolicy=IfNotPresent" \
  --set="balancer.repository=local/juice-balancer" \
  --set="balancer.tag=$version" \
  --set="progressWatchdog.repository=local/progress-watchdog" \
  --set="progressWatchdog.tag=$version" \
  --set="juiceShopCleanup.repository=local/cleaner" \
  --set="juiceShopCleanup.tag=$version"
