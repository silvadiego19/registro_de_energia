import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { LeituraMySqlGateway } from '../gateways/leitura/leitura_gateway';
import { LeituraEntity } from '../entities/leitura_entity';
import { S3Gateway } from '../gateways/s3/s3_gateway';
import dotenv from 'dotenv';
import { CasaGateway } from '../gateways/casa/casa_gateway';
const app = express();
app.use(express.json());
app.use(cors());

// Listar rotas configuradas
app._router.stack
    .filter((r: any) => r.route)
    .forEach((r: any) => console.log(r.route.path));

dotenv.config({ path: './prod.env' })
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;
const asAws = Boolean(process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_REGION && process.env.AWS_BUCKET);

app.get('/casas', async (_, res) => {
    try {
        const leituraGateway = new CasaGateway();
        res.status(200).json(await leituraGateway.findAll());
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/casa', async (req, res) => {
    const { id, nomeProprietario } = req.body;
    console.log(nomeProprietario)
    if (!(id || nomeProprietario)) {
        return res.status(400).json({ message: "Nenhuma casa informda" })
    }
    try {
        const leituraGateway = new CasaGateway();
        return res.status(200).json(await leituraGateway.findByIDOrNomeProprietario(id ?? (nomeProprietario as string).toUpperCase()));
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/leituras', async (req, res) => {
    const { casaId, initialDate, finalDate } = req.body;
    try {
        if (!casaId) {
            return res.status(400).json({ message: "Nenhuma casa informda" });
        }
        const leituraGateway = new LeituraMySqlGateway();
        const [leituras, totalContadorPorDaCasa] = await Promise.all([
            leituraGateway.findAllByCasaId(casaId, initialDate, finalDate), leituraGateway.getTotalContadorByCasaId(casaId, initialDate, finalDate)
        ]);
        return res.status(200).json({ leituras, totalContadorPorDaCasa, casaId });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

app.get("/leituras/resumo", async (req, res) => {
    const { casaId } = req.body;
    if (!casaId) {
        return res.status(400).json({ message: "Nenhuma casa informda" });
    }
    try {
        const leituraGateway = new LeituraMySqlGateway();
        const resumo = await leituraGateway.resumoAnual(casaId);
        return res.status(200).json(resumo);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

app.post("/leitura", upload.single('photo'), async (req, res) => {
    const { contador, casaId } = req.body;
    const photo = req.file;
    const s3Gateway = new S3Gateway()
    let urlPhoto;
    try {
        if (!casaId) {
            return res.status(400).json({ message: "Casa não informada" });
        }

        if (contador) {
            if (photo && asAws) {
                await s3Gateway.uploadFileToS3(photo);
                urlPhoto = s3Gateway.getFileUrl(photo);
            }
            const leitura = new LeituraEntity(parseInt(contador), urlPhoto ?? null, new Date(), '');
            const leituraGateway = new LeituraMySqlGateway();
            const newLeitura = await leituraGateway.create(leitura, casaId);
            return res.status(201).json({ message: "Leitura recebida com sucesso", leitura: newLeitura });
        } else {
            return res.status(400).json({ message: "Dados incompletos" });
        }

    } catch (error: any) {
        if (urlPhoto && asAws) {
            await s3Gateway.deleteFile(urlPhoto);
        }
        return res.status(500).json({ error: error.message });
    }
});

app.delete("/leitura", async (req, res) => {
    const { id, photo, contador, createAt, casaId } = req.body;
    if (!casaId) {
        return res.status(400).json({ message: "Casa não informada" });
    }
    if (!id) {
        return res.status(400).json({ message: "Dados incompletos" });
    }
    try {
        const leituraGateway = new LeituraMySqlGateway();
        const s3Gateway = new S3Gateway()
        await Promise.all([
            leituraGateway.delete(new LeituraEntity(contador, photo, createAt, id), casaId),
            photo && asAws && s3Gateway.deleteFile(photo),
        ]);
        return res.status(200).json({ message: "Leitura deletada com sucesso", leitura: { id, photo, contador, createAt } });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
