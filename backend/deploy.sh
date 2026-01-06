docker buildx build --platform linux/amd64 --provenance=false -t dsow-backend .         
docker tag dsow-backend:latest 308102972045.dkr.ecr.ap-northeast-1.amazonaws.com/dsow-backend:latest
docker push 308102972045.dkr.ecr.ap-northeast-1.amazonaws.com/dsow-backend:latest                  
aws lambda update-function-code --function-name dsow-backend-api --image-uri 308102972045.dkr.ecr.ap-northeast-1.amazonaws.com/dsow-backend:latest