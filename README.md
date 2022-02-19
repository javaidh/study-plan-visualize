# study-plan-visualize

## Requirements

You need to have

- Docker with Kubernetes enabled
- Skaffold
- NGINX Ingress Controller [https://kubernetes.github.io/ingress-nginx/]

## First Time Setup

Make sure to run the following command for NGINX Ingress Preflight checks:

``kubectl get pods --namespace=ingress-nginx``

## Running Development ENV

run ``skaffold dev`` to run Development Environment.

The Client should be running on localhost, and your backend services should be running in kubernetes

in order to check the Docs for Each API, please go into the src/index.ts to get the relative url to the root and append it after localhost

Example:

- ``/api/skills/skill-docs`` will become ``localhost/api/skills/skill-docs``

## Current Working Services

These are the services that are current operational (Will be updated per PR)

- programming-lng-services
- courses
- skills**