import { connect } from '../../db/my_sql';
import { LeituraEntity } from '../../entities/leitura_entity';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

function toLocalSqlDate(date: Date) {
    // Ajustar para o fuso horário local
    const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    // Formatar para o padrão SQL
    return localTime.toISOString().slice(0, 19).replace('T', ' ');
}
export class LeituraMySqlGateway {
    async getTotalContadorByCasaId(casaId: string, initialDate?: Date, finalDate?: Date): Promise<number> {
        const connection = await connect();
        try {
            let query = "SELECT SUM(contador) AS totalContador FROM leituras WHERE casas_id = ?";
            const queryParams = [casaId];
            if (initialDate && finalDate) {
                query += " AND createAt BETWEEN ? AND ?";
                queryParams.push(new Date(initialDate).toISOString().slice(0, 19), new Date(finalDate).toISOString().slice(0, 19));
            }
            const [rows] = await connection.execute(query, queryParams);

            const totalContador = Number((rows as any)[0].totalContador);
            return totalContador;
        } catch (error: any) {
            console.log({ error });
            throw new Error('Erro ao buscar o total do contador');
        } finally {
            connection.end();
        }
    }

    async findAllByCasaId(casaId: string, initialDate?: Date, finalDate?: Date): Promise<LeituraEntity[]> {
        const connection = await connect();
        try {
            let query = "SELECT * FROM leituras WHERE casas_id = ?";
            const queryParams = [casaId];
            if (initialDate && finalDate) {
                query += " AND createAt BETWEEN ? AND ?";
                queryParams.push(new Date(initialDate).toISOString().slice(0, 19), new Date(finalDate).toISOString().slice(0, 19));
            }
            const [rows] = await connection.execute(query, queryParams);

            return (rows as []).map((row: any) => new LeituraEntity(row.contador, row.photo, new Date(row.createAt), row.id));
        } catch (error: any) {
            console.log({ error })
            throw new Error('Erro ao buscar leituras');
        } finally {
            connection.end();
        }
    }


    async create(leitura: LeituraEntity, casaId: string): Promise<LeituraEntity> {
        const connection = await connect();
        try {
            const [result] = await connection.execute<ResultSetHeader>(
                "INSERT INTO leituras (contador, photo, createAt, casas_id) VALUES (?, ?, ?, ?)",
                [leitura.contador, leitura.photo, toLocalSqlDate(leitura.createAt), casaId]
            );

            // Agora result é tratado como ResultSetHeader, que inclui insertId
            const leituraId = result.insertId;

            const [rows] = await connection.query<RowDataPacket[]>(
                "SELECT * FROM leituras WHERE id = ?",
                [leituraId]
            );

            // Assumindo que rows contém os dados da leitura
            return rows[0] as LeituraEntity;
        } catch (error: any) {
            console.log({ error })
            throw new Error('Erro ao criar leitura');
        } finally {
            connection.end();
        }
    }

    async delete(leitura: LeituraEntity, casaId: string): Promise<void> {
        const connection = await connect();
        try {
            await connection.execute(
                "DELETE FROM leituras WHERE id = ? AND casas_id = ?",
                [leitura.id, casaId]
            );
        } catch (error: any) {
            console.log({ error })
            throw new Error('Erro ao excluir leitura');
        } finally {
            connection.end();

        }
    }

    async resumoAnual(casaId: string): Promise<any> {
        const connection = await connect();
        try {
            const query = `
            SELECT
                DATE_FORMAT(createAt, '%Y-%m') AS mes_referencia,
                MAX(contador) AS leitura_final,
                MIN(contador) AS leitura_inicial,
                MAX(createAt) AS data_leitura
            FROM
                leituras
            WHERE
                casas_id = ?
            GROUP BY
                DATE_FORMAT(createAt, '%Y-%m')
            ORDER BY
                DATE_FORMAT(createAt, '%Y-%m');
        `;
            const [rows] = await connection.execute<RowDataPacket[]>(query, [casaId]);
            let resumo = rows.map(row => ({
                total_leitura: row.leitura_final,
                consumo: row.leitura_final - row.leitura_inicial,
                data_leitura: row.data_leitura.toISOString()
            }));
            return resumo;
        } catch (error) {
            console.error('Erro ao buscar o resumo anual:', error);
            throw error;
        } finally {
            connection.end();
        }
    }
}
