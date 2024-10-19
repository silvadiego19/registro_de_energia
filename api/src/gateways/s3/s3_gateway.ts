import fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, PutObjectCommandInput, S3ClientConfig, DeleteObjectCommand } from "@aws-sdk/client-s3";


export class S3Gateway {
    #accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    #secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    #s3Config: S3ClientConfig = {
        region: process.env.AWS_REGION,
        credentials: { accessKeyId: this.#accessKeyId!, secretAccessKey: this.#secretAccessKey! },
    }
    #uniqueKey = uuidv4();
    async uploadFileToS3(file: Express.Multer.File) {
        const fileStream = fs.createReadStream(file.path);
        const fileExtension = path.extname(file.originalname);

        const putData: PutObjectCommandInput = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${this.#uniqueKey}-${file.fieldname}${fileExtension}`,
            StorageClass: 'STANDARD',
            Body: fileStream
        };
        try {
            const s3Client = new S3Client(this.#s3Config);
            await s3Client.send(new PutObjectCommand(putData));
            console.log(file.path)
            fs.unlinkSync(file.path);
            fileStream.destroy().close();
        } catch (err: any) {
            console.log(file.path)
            throw Error(`Erro ao tentar salvar o arquivo`);
        }
    }

    getFileUrl(file: Express.Multer.File): string {
        const fileExtension = path.extname(file.originalname);
        return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(`${this.#uniqueKey}-${file.fieldname}`)}${fileExtension}`;
    }


    async deleteFile(fileUrl: string) {
        try {
            const url = new URL(fileUrl);
            const key = url.pathname.substring(1);
            const deleteData = {
                Bucket: process.env.AWS_BUCKET,
                Key: key
            };
            const s3Client = new S3Client(this.#s3Config);
            await s3Client.send(new DeleteObjectCommand(deleteData));
        } catch (err: any) {
            throw new Error(`Erro ao tentar deletar o arquivo`);
        }
    }


}
