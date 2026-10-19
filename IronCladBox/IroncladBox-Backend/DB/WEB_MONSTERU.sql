/*==============================================================*/
/* DBMS name:      PostgreSQL 8                                 */
/* Created on:     1/21/2026 9:25:46 AM                         */
/*==============================================================*/


DROP INDEX USU_ATLE_FK;

DROP INDEX ATLETA_PK;

DROP TABLE ATLETA;

DROP INDEX ENTRE_CLASE_FK;

DROP INDEX CLASE_PK;

DROP TABLE CLASE;

DROP INDEX CONTACTO_PK;

DROP TABLE CONTACTO;

DROP INDEX USU_ENTRE_FK;

DROP INDEX ENTRENADOR_PK;

DROP TABLE ENTRENADOR;

DROP INDEX INSCRIPCION_FK;

DROP INDEX INSCRIPCION2_FK;

DROP INDEX INSCRIPCION_PK;

DROP TABLE INSCRIPCION;

DROP INDEX USU_ENTRE2_FK;

DROP INDEX USU_ATLE2_FK;

DROP INDEX USUARIO_PK;

DROP TABLE USUARIO;

/*==============================================================*/
/* Table: ATLETA                                                */
/*==============================================================*/
CREATE TABLE ATLETA (
   ID_ATLETA            INT4                 NOT NULL,
   ID_USUARIO           INT4                 NULL,
   PESO                 DECIMAL              NOT NULL,
   ESTATURA             DECIMAL              NOT NULL,
   NIVEL                VARCHAR(100)         NOT NULL,
   CONSTRAINT PK_ATLETA PRIMARY KEY (ID_ATLETA)
);

/*==============================================================*/
/* Index: ATLETA_PK                                             */
/*==============================================================*/
CREATE UNIQUE INDEX ATLETA_PK ON ATLETA (
ID_ATLETA
);

/*==============================================================*/
/* Index: USU_ATLE_FK                                           */
/*==============================================================*/
CREATE  INDEX USU_ATLE_FK ON ATLETA (
ID_USUARIO
);

/*==============================================================*/
/* Table: CLASE                                                 */
/*==============================================================*/
CREATE TABLE CLASE (
   ID_CLASE             INT4                 NOT NULL,
   ID_ENTRENADOR        INT4                 NULL,
   NOMBRE_CLASE         VARCHAR(30)          NOT NULL,
   DESCRIPCION          VARCHAR(300)         NOT NULL,
   FECHA                DATE                 NOT NULL,
   HORA                 TIME                 NOT NULL,
   CUPO_MAXIMO          INT4                 NOT NULL,
   CONSTRAINT PK_CLASE PRIMARY KEY (ID_CLASE)
);

/*==============================================================*/
/* Index: CLASE_PK                                              */
/*==============================================================*/
CREATE UNIQUE INDEX CLASE_PK ON CLASE (
ID_CLASE
);

/*==============================================================*/
/* Index: ENTRE_CLASE_FK                                        */
/*==============================================================*/
CREATE  INDEX ENTRE_CLASE_FK ON CLASE (
ID_ENTRENADOR
);

/*==============================================================*/
/* Table: CONTACTO                                              */
/*==============================================================*/
CREATE TABLE CONTACTO (
   ID_CONTACTO          INT4                 NOT NULL,
   NOMBRE_CONTACTO      VARCHAR(25)          NOT NULL,
   EMAIL                VARCHAR(150)         NOT NULL,
   MENSAJE              VARCHAR(1000)        NOT NULL,
   FECHA                DATE                 NOT NULL,
   CONSTRAINT PK_CONTACTO PRIMARY KEY (ID_CONTACTO)
);

/*==============================================================*/
/* Index: CONTACTO_PK                                           */
/*==============================================================*/
CREATE UNIQUE INDEX CONTACTO_PK ON CONTACTO (
ID_CONTACTO
);

/*==============================================================*/
/* Table: ENTRENADOR                                            */
/*==============================================================*/
CREATE TABLE ENTRENADOR (
   ID_ENTRENADOR        INT4                 NOT NULL,
   ID_USUARIO           INT4                 NULL,
   ESPECIALIDAD         VARCHAR(100)         NOT NULL,
   CERETIFICACIONES     VARCHAR(100)         NOT NULL,
   CONSTRAINT PK_ENTRENADOR PRIMARY KEY (ID_ENTRENADOR)
);

/*==============================================================*/
/* Index: ENTRENADOR_PK                                         */
/*==============================================================*/
CREATE UNIQUE INDEX ENTRENADOR_PK ON ENTRENADOR (
ID_ENTRENADOR
);

/*==============================================================*/
/* Index: USU_ENTRE_FK                                          */
/*==============================================================*/
CREATE  INDEX USU_ENTRE_FK ON ENTRENADOR (
ID_USUARIO
);

/*==============================================================*/
/* Table: INSCRIPCION                                           */
/*==============================================================*/
CREATE TABLE INSCRIPCION (
   ID_CLASE             INT4                 NOT NULL,
   ID_ATLETA            INT4                 NOT NULL,
   CONSTRAINT PK_INSCRIPCION PRIMARY KEY (ID_CLASE, ID_ATLETA)
);

/*==============================================================*/
/* Index: INSCRIPCION_PK                                        */
/*==============================================================*/
CREATE UNIQUE INDEX INSCRIPCION_PK ON INSCRIPCION (
ID_CLASE,
ID_ATLETA
);

/*==============================================================*/
/* Index: INSCRIPCION2_FK                                       */
/*==============================================================*/
CREATE  INDEX INSCRIPCION2_FK ON INSCRIPCION (
ID_ATLETA
);

/*==============================================================*/
/* Index: INSCRIPCION_FK                                        */
/*==============================================================*/
CREATE  INDEX INSCRIPCION_FK ON INSCRIPCION (
ID_CLASE
);

/*==============================================================*/
/* Table: USUARIO                                               */
/*==============================================================*/
CREATE TABLE USUARIO (
   ID_USUARIO           INT4                 NOT NULL,
   ID_ATLETA            INT4                 NULL,
   ID_ENTRENADOR        INT4                 NULL,
   NOMBRE_CLASE         VARCHAR(30)          NOT NULL,
   APELLIDO             VARCHAR(25)          NOT NULL,
   EMAIL                VARCHAR(150)         NOT NULL,
   PASSWORD             VARCHAR(250)         NOT NULL,
   ROL                  VARCHAR(30)          NOT NULL,
   ESTADO               BOOL                 NOT NULL,
   FECHA_CREACION       DATE                 NOT NULL,
   CONSTRAINT PK_USUARIO PRIMARY KEY (ID_USUARIO)
);

/*==============================================================*/
/* Index: USUARIO_PK                                            */
/*==============================================================*/
CREATE UNIQUE INDEX USUARIO_PK ON USUARIO (
ID_USUARIO
);

/*==============================================================*/
/* Index: USU_ATLE2_FK                                          */
/*==============================================================*/
CREATE  INDEX USU_ATLE2_FK ON USUARIO (
ID_ATLETA
);

/*==============================================================*/
/* Index: USU_ENTRE2_FK                                         */
/*==============================================================*/
CREATE  INDEX USU_ENTRE2_FK ON USUARIO (
ID_ENTRENADOR
);

ALTER TABLE ATLETA
   ADD CONSTRAINT FK_ATLETA_USU_ATLE_USUARIO FOREIGN KEY (ID_USUARIO)
      REFERENCES USUARIO (ID_USUARIO)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE CLASE
   ADD CONSTRAINT FK_CLASE_ENTRE_CLA_ENTRENAD FOREIGN KEY (ID_ENTRENADOR)
      REFERENCES ENTRENADOR (ID_ENTRENADOR)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE ENTRENADOR
   ADD CONSTRAINT FK_ENTRENAD_USU_ENTRE_USUARIO FOREIGN KEY (ID_USUARIO)
      REFERENCES USUARIO (ID_USUARIO)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE INSCRIPCION
   ADD CONSTRAINT FK_INSCRIPC_INSCRIPCI_CLASE FOREIGN KEY (ID_CLASE)
      REFERENCES CLASE (ID_CLASE)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE INSCRIPCION
   ADD CONSTRAINT FK_INSCRIPC_INSCRIPCI_ATLETA FOREIGN KEY (ID_ATLETA)
      REFERENCES ATLETA (ID_ATLETA)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE USUARIO
   ADD CONSTRAINT FK_USUARIO_USU_ATLE2_ATLETA FOREIGN KEY (ID_ATLETA)
      REFERENCES ATLETA (ID_ATLETA)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE USUARIO
   ADD CONSTRAINT FK_USUARIO_USU_ENTRE_ENTRENAD FOREIGN KEY (ID_ENTRENADOR)
      REFERENCES ENTRENADOR (ID_ENTRENADOR)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

