// src/models/User.ts
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  CreatedAt,
  Scopes, // <-- 1. IMPORTA 'Scopes'
} from "sequelize-typescript";
import { includes } from "zod";

@Table({ tableName: "usuario", timestamps: false })
export class User extends Model {
 
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id_usuario!: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nombre!: string;

  @Column({ type: DataType.STRING(100) })
  apellido_paterno?: string;

  @Column({ type: DataType.STRING(100) })
  apellido_materno?: string;

  // ...existing code...
  @Column({ type: DataType.STRING(255), allowNull: false })
  password_hash!: string;

  @Unique
  @Column({ type: DataType.STRING(150), allowNull: false })
  email!: string;

  @Unique
  @Column(DataType.STRING(50))
  nfc_uid?: string;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  saldo_virtual!: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: "fecha_registro" })
  fecha_registro?: Date;
}
